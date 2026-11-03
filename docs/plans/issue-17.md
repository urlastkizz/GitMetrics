# Issue #17: Show only top languages in repository output

- Issue: https://github.com/urlastkizz/GitMetrics/issues/17
- Size: M (medium path approved by the author after initial S triage).
- Branch: `feat/17-top-languages`
- Base: `856f9db0ed1c63b74ba938bdd15d671c3c47d210`
- Status: implemented; complete test audit and standard code review approved.

## Goal and acceptance criteria

Make language tables readable while preserving the full JSON contract.

1. Given many languages, running `gitmetrics repo owner/name` shows the top five by percentage and groups the rest into `Other` with their summed percentage.
2. Given five or fewer languages, running the command shows no `Other` row.
3. Given `--languages <n>` with an integer from 1 through 20, the table shows the top n languages plus `Other` when necessary.
4. Given an out-of-range or noninteger value, the command prints a short usage error and exits with code 2.
5. Given `--json`, output retains the complete, ungrouped language data without changes to existing values.
6. Given a nonempty language table, displayed percentages total exactly 100%, including rounding correction.
7. Typecheck, lint, tests, and build pass.

Out of scope: colors, charts, other commands, new dependencies, and changes to the GitHub API or core metrics.

## Subtask 1: Group and balance table rows

Files: `src/output/repo.ts`, `tests/unit/output/repo.test.ts`.
Criteria: 1, 2, 3, 5, 6. Dependencies: none.

- Add an optional numeric `languages` formatter option, defaulting to 5.
- Preserve the existing byte-based language ordering, including ties in rounded percentages. Select the first n rows and sum omitted percentages into `Other`, always last.
- Keep JSON serialization and input data unchanged.
- Balance only table percentages: aggregate first, use integer hundredths, and apply the residual to the largest displayed row, breaking ties by existing order.
- Preserve `No languages` for empty results; empty results do not require a 100% total.

Tests first:

- More than five distinct languages: exact top-five names, order, values, omitted names, and summed `Other`.
- One and exactly five languages: no `Other`; retain the empty result test.
- Limits 1 and 20, including a count equal to the requested limit.
- Full parsed JSON equality for more than five languages with `languages: 1`, and no input mutation.
- Independently rounded totals above and below 100%, grouped and ungrouped: exact displayed values and integer-hundredth sum of 10000.
- Include a residual larger than one hundredth and a case where `Other` is the largest displayed row.

## Subtask 2: Parse and validate the CLI option

Files: `src/cli/commands/repo.ts`, `tests/unit/cli/repo.test.ts`.
Criteria: 3, 4, 5. Depends on subtask 1.

- Add `--languages <n>` with clear help text describing default 5 and range 1–20.
- Reuse the activity command's Zod validation pattern: digits-only string, numeric conversion, integer and range checks.
- Validate before resolving the token or loading repository data. Pass the parsed number explicitly to the formatter.
- Preserve Commander's existing handling of missing option values.

Tests first:

- Default and explicit limits 1 and 20 produce exact expected table rows; help describes the flag.
- Invalid 0, 21, negative, decimal, nonnumeric, scientific-notation, and empty values produce exit code 2, short exact stderr, empty stdout, and no loader call.
- JSON combined with a valid limit preserves the complete original language list.

## Subtask 3: Verify the complete mocked flow

File: `tests/integration/repo.test.ts`.
Criteria: 1–6. Depends on subtasks 1 and 2.

- Extend existing injected-fetch fixtures to accept language byte counts. Keep all automated GitHub access mocked.
- Test default top-five grouping using more than five languages, and retain the full two-language table test without `Other`.
- Test top-one grouping using uneven byte counts.
- Exercise `runCli` with invalid limits and a missing option value: exit 2, empty stdout, useful stderr, and no API access.
- Assert full JSON equality with more than five languages and a table limit; retain both global and local `--json` coverage.
- Use equal byte counts, grouped and ungrouped, to assert displayed totals of 10000 hundredths while JSON retains its existing independently rounded values.
- Preserve existing authentication, network, and rate-limit coverage.

## Subtask 4: Document and validate

File: `README.md`.
Criterion: 7. Depends on subtasks 1–3.

- Update repository syntax, options, default top-five/`Other` explanation, and an example.
- Explain that table percentages are balanced while JSON keeps independently rounded values.
- Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`.
- Run `npm run test:coverage` to confirm core coverage remains at least 80%.
- Execute the built CLI: repository help, an invalid limit, a real public repository table with `--languages 1 --no-color`, and the JSON equivalent. Inspect outputs and exit codes; live API verification remains outside automated tests.

## Delivery workflow

Order: 1 → 2 → 3 → 4. Implement with red/green TDD and record evidence.

Only the implementer commits code, using Conventional Commits with `Refs #17` in the body. After implementation, run the test auditor in complete mode (mutation only if already configured), then the reviewer in standard mode. Return findings to the implementer, with at most two retries and renewed audit/review after corrections.

The primary agent runs final verification, fetches and rebases onto `origin/main`, and repeats verification if the code changes. Push only the working branch and open a PR with `Closes #17`. The author performs the merge.

## Contracts, risks, and baseline

- Preserve `RepositoryMetrics`, response schemas, JSON fields and values, and existing formatter callers without options.
- No new dependencies. Changes are confined to CLI validation, table presentation, tests, and documentation.
- Core percentages already round independently; table correction must not leak into JSON or mutate metrics.
- Live verification depends on GitHub availability.
- Baseline passed: typecheck, lint, 148 tests in 17 files, and build.

Plan review: APPROVED. The reviewer requested explicit rounding cases with a residual larger than one hundredth and with `Other` as the largest row; both are included above.

Open questions: none identified by the planner or reviewer. The author approved this plan before implementation.

## Implementation evidence

- Implementation commit: `ae6fd46` (`Refs #17`).
- TDD: 42 new tests; grouping, CLI validation, and rounding failures observed before implementation.
- Suite: 190 tests in 17 files passed; typecheck, lint, and build passed.
- Core metrics coverage: 100% lines/statements, 96.42% branches.
- Complete test audit: approved, criteria 7/7 covered; no test quality findings.
- Mutation testing: not configured (no Stryker configuration or dependency).
- Standard code review: approved; correctness, security, and architecture checks passed.
- Primary-agent final verification: typecheck, lint, 190 tests, and build passed.
- Built CLI: help lists the range/default; invalid limit 21 exits with code 2. Authenticated live verification of `microsoft/TypeScript --languages 1` displayed `Go: 85.17%` and `Other: 14.83%`; JSON retained all five languages. The initial unauthenticated attempt hit the GitHub rate limit and emitted a useful error.
