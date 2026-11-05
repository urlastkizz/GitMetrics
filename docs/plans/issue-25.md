# Issue #25: Pull request merge metrics

Issue: https://github.com/urlastkizz/GitMetrics/issues/25
Size: M (issue label). Branch: `feat/25-pr-metrics`.
Base: `7b62891468c05ac694f87fb506232e2e398c584c`.
Status: approved by the author and implemented. Independent test audit and code
review approved all criteria, including a formatting-only correction.

## Design

Fetch one REST page with `state=closed`, `sort=updated`, `direction=desc`,
and `per_page=100`. Sort a copy of these candidates by `closed_at` descending
(stable for ties), then select up to the requested limit (default 50, range
1–100). This is an approximate sample of the latest closed PRs, because the
API orders the fetched page by last update. Include bot authors.

Calculate counts and merge rate over the selected sample. A PR is merged if
`merged_at` is non-null. Compute merge durations from creation to merge in UTC,
in seconds, without intermediate rounding. Empty samples have zero counts and
zero merge rate; absent merged PRs have null median and average durations.

Keep calculation pure in core, HTTP and response validation in github, and
terminal formatting in output. Reuse existing client, token resolution, error
mapping, CLI conventions and dependencies. No new dependencies.

## Ordered subtasks

1. **Pure metric (criteria 1, 2, 5, 6, 11).** Create
   `src/core/prs-types.ts`, `src/core/metrics/prs.ts`, and
   `tests/unit/core/prs.test.ts`. Test counts, rates, selection without mutation,
   empty input, no merges, closure ties, zero duration, even/odd medians and
   a slow outlier affecting the average.
2. **GitHub adapter (criteria 1, 2, 7, 8, 9, 11).** Create
   `src/github/prs.ts` and `tests/unit/github/prs.test.ts`. Fetch one page of
   100 candidates regardless of the limit; do not follow pagination links.
   Validate dates with Zod. Test request parameters, anonymous access, malformed
   responses, not-found errors, UTC rate-limit reset and sanitized token errors.
3. **Output (criteria 1, 4, 5, 6, 11).** Create `src/output/prs.ts` and
   `tests/unit/output/prs.test.ts`. Reuse cli-table3 and picocolors. Show two
   decimal places for percentages and durations in days/hours/minutes/seconds,
   omitting zero units and using `0s` for zero. Truncate only display seconds.
   Show `No closed pull requests` for empty samples and `n/a` for absent times.
   Test table, clean numeric JSON, nulls, duration boundaries and no-color.
4. **CLI command (criteria 1, 2, 3, 4, 9, 11).** Create
   `src/cli/commands/prs.ts` and `tests/unit/cli/prs.test.ts`. Follow repo's
   owner/name validation and token handling. Add `--limit`, `--json`,
   `--no-color`, `--token` and help. Validate a decimal integer in 1–100 before
   token resolution or loading. Test defaults, boundaries, invalid/missing
   values, fractional/exponential/negative/whitespace inputs, token precedence
   and JSON-only output.
5. **Executable wiring (criteria 1, 3, 4, 11).** Update `src/cli/index.ts`,
   `src/index.ts`, and `tests/integration/cli.test.ts`. Add the PR loader as
   the last optional runCli parameter to preserve existing callers. Wire the
   existing GitHub client at the executable boundary. Test root help, usage
   exit code 2, and global JSON flag before the command.
6. **Mocked end-to-end flow (criteria 1–9, 11).** Create
   `tests/integration/prs.test.ts`. Cover default 50, local closure sorting,
   requested limits, invalid input before token/HTTP access, both JSON flag
   positions, empty/no-merge data, not found, rate limit, optional/invalid
   tokens, redaction and network failures. Assert exactly one request, including
   when a pagination Link exists. Use fixtures with differing update/closure
   order and fewer PRs than requested. Mock all GitHub access.
7. **Documentation and validation (criteria 10, 11).** Update `README.md`
   Usage with syntax, flags, illustrative table/JSON, metric formulas, optional
   authentication and the approximate-window explanation. Run typecheck, lint,
   tests, coverage (core ≥80%) and build. Execute built help, invalid limit,
   and a real public-repository command to inspect output.

## Contracts

- `PullRequestSnapshot`: repository and pullRequests with createdAt, closedAt,
  and nullable mergedAt.
- `PullRequestMetrics`: repository, analyzed, merged, closedWithoutMerge,
  mergeRate, medianTimeToMergeSeconds, averageTimeToMergeSeconds.
- `PullRequestLoader(repository, token?)`: Promise of PullRequestSnapshot.
- The pure metric accepts snapshot and limit. JSON exposes the metric fields,
  numeric percentage and seconds (or null). Existing command JSON stays intact.
- The GitHub response schema validates snake_case dates and converts them to
  project types.

## Delivery workflow

After approval: implementer performs red/green TDD and commits with `Refs #25`;
test_auditor runs complete audit and mutation testing if configured; reviewer
performs standard review. Corrections restart at the audit (maximum two retries).
The orchestrator performs final verification, fetch/rebase, branch-only push
and opens a PR with `Closes #25`. The author owns the merge.

Out of scope: author/label/date filtering, excluding bots, review time, charts,
caching and new dependencies. No requested criteria are deferred.

Baseline checks passed before this plan: typecheck, lint, 190 tests in 17 files,
and build.
