# Issue #5: user activity command

Status: plan approved by the author; implementation passed test audit and code review.
Size: M (issue label). Workflow: medium path.
Branch: `feat/5-activity-command`.
Base SHA: `2711c176141e906a8a3fc96c2b54477df1b71b89`.
Issue: https://github.com/urlastkizz/GitMetrics/issues/5

## Goal and acceptance criteria

As a developer, I want to see a user's recent GitHub activity in the terminal.

Technical decision: use the GitHub GraphQL API (`contributionsCollection`, calendar days). This command requires a token. Dates are UTC.

1. Given a valid user and a token, when I run `gitmetrics activity <user>`, then I see, for the last 30 days (UTC, including today): total contributions, number of active days (days with at least 1 contribution) and the busiest day (date and count).
2. Given `--days <n>` with n between 1 and 365, when I run the command, then the same metrics are computed for that period.
3. Given `--days` outside 1-365 or not an integer, when I run the command, then I get a short usage error and exit code 2.
4. Given the `--json` flag, when I run the command, then the same data is printed as valid JSON and nothing else.
5. Given a user that does not exist, or no token available, when I run the command, then I get a friendly message (for the missing token, explaining how to set `GITHUB_TOKEN`) and exit code 1.

Out of scope: streaks, charts, contribution types breakdown, caching, and broad refactoring of existing commands.

## Approved business rules

The author approved option A:

- When busiest days tie, select the most recent date.
- When every day has zero contributions, return `busiestDay: null` in JSON and `No contributions` in the table. Total contributions and active days are both zero.

## Proposed contracts

- Add `activity <user>` with `--days <n>`, `--json`, `--no-color`, and `--token <token>`.
- Default to 30 calendar days including today in UTC. Accept 1 through 365 days.
- Capture one current instant at the edge. Start at UTC midnight today minus n-1 days; query until that captured instant. Today's contribution count is partial up to the query.
- Reuse the same period in the request, calculation, and displayed output. Support year boundaries and leap days using native Date operations.
- Require a nonblank token; explicit `--token` takes precedence over `GITHUB_TOKEN`. Missing authentication explains both configuration options without exposing credentials.
- Validate username and days before authentication or network access. Days must use an integer decimal representation; reject fractions, exponent notation, trailing text, missing values, and values outside the range.
- Sum `contributionCount` for dates in the requested period, rather than annual totals. Count active days with at least one contribution. Ignore calendar padding dates outside the period; reject duplicate dates and invalid counts.
- Query `user(login)` and `contributionsCollection(from, to).contributionCalendar.weeks.contributionDays` using GraphQL variables. Validate consumed response fields with zod.
- GraphQL errors may arrive with HTTP 200 and partial data. Treat these as failures instead of emitting partial success. Distinguish missing users, invalid tokens, permissions, rate limits, and service/network errors with safe messages.
- Preserve profile/repo behavior, their JSON contracts, executable aliases, and the current `runCli` call signature by adding an optional activity loader.
- Reuse the existing Octokit client, token resolver, output libraries, dependency injection, and test patterns. No new dependencies.
- Core remains pure: no HTTP, terminal, tokens, or global clock access. Octokit stays in `src/github`; concrete composition stays in `src/index.ts`.
- Usage failures write stderr and exit 2; token/user/API failures write stderr and exit 1; stdout is empty on failure. Success writes only the selected formatter output, with a trailing newline, and exits 0.

Proposed JSON:

```json
{
  "user": "octocat",
  "days": 2,
  "startDate": "2026-01-01",
  "endDate": "2026-01-02",
  "totalContributions": 3,
  "activeDays": 1,
  "busiestDay": { "date": "2026-01-02", "count": 3 }
}
```

The username is canonicalized from the API response. An inactive period keeps the same period fields, sets both totals to zero, and uses `busiestDay: null`.

## Ordered subtasks

### 1. Define the UTC activity period

- Files: `src/core/activity-types.ts`, `src/core/activity-period.ts`, `tests/unit/core/activity-period.test.ts`.
- Criteria: 1, 2, 4. Depends on: none.
- Define `ActivityPeriod`, `ActivitySnapshot`, `ActivityMetrics`, and `ActivityLoader` contracts.
- Tests: default 30-day inclusive UTC period; bounds 1 and 365; unambiguous output dates; year boundaries; leap days; supplied instant independent of local timezone.

### 2. Calculate pure contribution metrics

- Files: `src/core/metrics/activity.ts`, `tests/unit/core/activity.test.ts`.
- Criteria: 1, 2, 4. Depends on: 1.
- Tests: sum contributions and active days; filter the requested period; serializable metrics; recent date wins ties; inactive period yields null; unordered days; reject duplicates and invalid counts.

### 3. Map GraphQL errors

- Files: `src/github/activity-errors.ts`, `tests/unit/github/activity-errors.test.ts`.
- Criteria: 1, 5. Depends on: none.
- Tests: safe actionable service errors; missing user; invalid authentication without credential leakage; HTTP 200 GraphQL errors; rate limits without invented reset times; sanitized unexpected messages.
- Reuse HTTP/network error handling only when its message fits activity. Never report a missing user as a missing repository or print raw request details.

### 4. Load the contribution calendar

- Files: `src/github/activity.ts`, `tests/unit/github/activity.test.ts`.
- Criteria: 1, 2, 5. Depends on: 1, 3.
- Reuse `createGitHubClient().graphql` and zod. Return project-owned snapshot types.
- Tests: dated contribution counts; explicit UTC bounds across years; null user; query variables; malformed calendar; partial results with errors; requested inactive period remains unchanged.
- No event pagination or annual partitioning is needed for the calendar query. Use the exact requested interval, at most 365 days, and let core exclude padding days. Do not replace inactive periods with earlier activity.
- Contributions reflect data GitHub exposes for the user and token. Do not add repository queries or per-type breakdowns.
- Reference: https://docs.github.com/en/graphql/reference/users

### 5. Format activity output

- Files: `src/output/activity.ts`, `tests/unit/output/activity.test.ts`.
- Criteria: 1, 2, 4. Depends on: 2.
- Reuse cli-table3 and picocolors; return strings and keep writing in the CLI.
- Tests: table associates all metric labels with exact values; custom UTC period; exactly one JSON object matching computed metrics; `No contributions` for null; disabled color has no ANSI.

### 6. Register the activity command

- Files: `src/cli/commands/activity.ts`, `tests/unit/cli/activity.test.ts`.
- Criteria: 1-5. Depends on: 1, 2, 5.
- Export `registerActivityCommand` with an injected loader and reuse `resolveToken`.
- Tests: default 30 days with token; bounds 1/365; invalid days show a short usage message/status 2 without loading; JSON-only success; missing token explains `GITHUB_TOKEN` and exits 1; missing user exits 1; token precedence; help; missing/malformed username.
- Treat blank tokens as absent. Do not use permissive `parseInt` parsing. CLI contains no GraphQL transport or metric calculations beyond calling the pure core functions.

### 7. Compose and integrate

- Files: `src/cli/index.ts`, `src/index.ts`, `tests/integration/activity.test.ts`.
- Criteria: 1-5. Depends on: 4, 6.
- Compose the authenticated loader in `src/index.ts` and inject it through a compatible optional `runCli` parameter.
- Tests: mocked GraphQL-to-table flow; custom period across years; invalid days status 2 without HTTP; JSON before/after subcommand with exact output; missing token without network; GraphQL user-not-found status 1; tie rule; zero activity; no partial stdout on failure.
- Freeze the clock and block real network access in automated tests.

### 8. Document and verify compatibility

- Files: `README.md`, `tests/integration/cli.test.ts`, `tests/unit/github/client.test.ts`.
- Criteria: 1-5. Depends on: 7.
- Document examples, token requirement/precedence, UTC, partial current day, GitHub calendar semantics, tie/no-activity rules, JSON fields, and exit codes.
- Tests: root help includes activity; GraphQL uses existing authentication and effective timeout; all profile/repo tests remain green.
- Verify typecheck, lint, formatting for changed files, tests, core coverage at least 80%, and build. Record existing unrelated global formatting failures without expanding scope.
- Run the built command with invalid days (status 2) and without a token (status 1 and guidance).
- Run an authenticated smoke test when a token is available, without printing/storing the token. If unavailable, disclose the limitation and do not claim a live authenticated success.

## Delivery workflow

1. Obtain author approval of this concrete plan before implementation.
2. Delegate to implementer for red/green TDD and focused Conventional Commits with `Refs #5`.
3. Delegate to test auditor in complete mode, mapping all five criteria to tests. Run mutation testing only if Stryker is already configured.
4. Delegate to reviewer in standard mode.
5. Route rejections to implementer and repeat from test auditor, with at most two retries.
6. Maestro runs and reports typecheck, lint, tests, build, and the compiled CLI.
7. Fetch/rebase onto `origin/main` and repeat verification if the code changes.
8. Push only the working branch and open an English PR with `Closes #5`. The author performs the merge.

## Initial baseline

Typecheck, lint, all 44 tests in 9 files, and build passed before implementation. No application code has changed.
