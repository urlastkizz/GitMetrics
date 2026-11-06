# Issue #30: Activity streaks

Status: approved by the author on 2026-11-05.
Size: M (issue label).
Base: `b30d2412a806c576d1b40a1a75766d8393e21095`.
Branch: `feat/30-activity-streaks`.

## Agreed behavior

- Fetch one contribution calendar covering 365 UTC days, including today.
- Keep existing period metrics and JSON fields governed by `--days`.
- Add `currentStreak` and `longestStreak`, each `{ days, truncated }`.
- Count consecutive days with at least one contribution. Current streak ends
  today, or yesterday when today is inactive; two inactive days reset it.
- Author clarification replaces criterion 7: a run touching the first window
  day preserves its observed length and has `truncated: true`. Display it as
  `N+ days`, including `2+ days` and `365+ days`. Other runs are not truncated.
- When longest runs tie, prefer a truncated run because its actual duration
  may be longer. No contributions means zero days and no truncation.
- Preserve existing errors and exit codes. Add no dependencies.

## Ordered implementation

### 1. Pure streak calculation

Create `src/core/metrics/streaks.ts` and
`tests/unit/core/streaks.test.ts`. Covers criteria 3–7 and 11.

Test an empty calendar, no active days, today active, today inactive with
yesterday active, two inactive days, gaps, equal runs, a short run touching
the first day, a truncated run tied with a later non-truncated run, all 365
days active, and only today inactive (364 truncated days). Exercise unordered
dates, missing days, and contributions outside the UTC window. Walk the UTC
window rather than assuming calendar order or completeness.

### 2. Integrate metrics while preserving period totals

Change `src/core/activity-types.ts`, `src/core/metrics/activity.ts`, and
`tests/unit/core/activity.test.ts`. Depends on step 1; covers 2, 6–8, 11.

Add both streak objects to `ActivityMetrics`. Derive the fixed window from
the supplied period end, preserving purity and existing validation. Test
that old fields retain their meaning, different requested periods share the
same streaks, and inactive calendars return zero totals and streaks. Preserve
existing invalid-data, duplicate-date, and busiest-day tie tests.

### 3. Load one fixed calendar from the CLI

Change `src/cli/commands/activity.ts` and
`tests/unit/cli/activity.test.ts`. Depends on step 2; covers 1, 2, 8, 9, 11.

Capture the clock once for both periods. Give the existing loader a 365-day
window and the calculator the requested period. Test default, 1-day, and
365-day requests and the single captured instant. Update JSON expectations
and retain argument, token, help, and not-found checks. The existing GitHub
loader already accepts a period and needs no implementation changes.

### 4. Render table and JSON

Change `src/output/activity.ts` and
`tests/unit/output/activity.test.ts`. Depends on step 2; covers 1, 6–8.

Add Current streak and Longest streak rows. Format normal values as `N days`
and truncated values as `N+ days`. Test exact counts, zero, `2+`, `364+`, and
`365+`, additive JSON fields and flags, and disabled-color output. Keep
calculation outside the formatter.

### 5. Verify the complete mocked flow

Change `tests/integration/activity.test.ts`. Depends on steps 3–4;
covers 1–9 and 11.

Assert one GraphQL call with a fixed 365-day window regardless of `--days`,
period totals independent from streaks, current streak including today or
ending yesterday, two inactive days, no activity, and truncated table/JSON
output. Retain existing token, 401, not-found, and partial GraphQL error
checks, and cover rate-limit messages and exit codes. Mock all GitHub access
and fix the test clock.

### 6. Document and validate

Change `README.md`. Depends on step 5; covers 10–11.

Replace the outdated exclusion of streaks. Explain the fixed UTC window,
today's grace, independence from `--days`, observed-length truncation, and
the tie preference. Update illustrative table and JSON examples.

Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, and
`npm run test:coverage` (core coverage at least 80%). Audit tests in complete
mode, then request standard code review. Stryker is not configured; do not
add it. Finally run the maestro's verification and built CLI help plus
activity table/JSON examples without exposing credentials. Rebase onto
`origin/main`, repeat verification if needed, push the work branch, and open
a PR with `Closes #30`. The author merges.

## Delivery constraints

Implement with red/green tests, following the existing project patterns.
Only the implementer commits code, using Conventional Commits with
`Refs #30` in the body. Audit/review/verification failures return to the
implementer and restart the audit, with at most two retries.

No charts, streak history, other time zones, other commands, or new
dependencies. No unresolved business-rule questions remain. Implementation
starts only after the author approves this plan.
