# Issue #10: Authentication documentation and token errors

Issue: https://github.com/urlastkizz/GitMetrics/issues/10

Base commit: `50ed198214c8811f17a93998a5a82ca7bdf92d89`

Branch: `fix/10-authentication-guidance`

Workflow: medium, authorized by the author after the short-path triage identified profile authentication work. Implementation awaits approval of this plan.

## Goal

Help users configure GitHub authentication in their shell, distinguish missing tokens from rejected tokens, and keep credentials out of terminal output.

## 1. Make REST authentication rejection explicit

- Criteria: 6, 7.
- Files: `src/github/errors.ts`, `tests/unit/github/client.test.ts`.
- Dependencies: none.
- Test first: extend `sanitizes authentication, forbidden and network errors` to require a fixed rejected-token message for HTTP 401, distinguish rejection from missing credentials, and exclude token values embedded in raw errors. Observe red before updating the mapper.
- Preserve mappings for all other statuses and network failures.

## 2. Reuse rejection handling for GraphQL activity

- Criteria: 6, 7.
- Files: `src/github/activity-errors.ts`, `tests/unit/github/activity-errors.test.ts`.
- Dependencies: step 1.
- Test first: update `maps activity failures safely` to require the same rejected-token message for HTTP 401 and exclude credentials from raw error details.
- Reuse `githubError` for the 401 branch while retaining `ActivityError` and existing GraphQL mappings.

## 3. Explain missing tokens and test activity failures

- Criteria: 5, 6, 7.
- Files: `src/cli/commands/activity.ts`, `tests/unit/cli/activity.test.ts`, `tests/integration/activity.test.ts`.
- Dependencies: step 2.
- Test first: extend missing/blank-token tests to assert the literal setup commands `$env:GITHUB_TOKEN = 'YOUR_TOKEN'` and `export GITHUB_TOKEN='YOUR_TOKEN'`, the link `https://github.com/urlastkizz/GitMetrics#authentication`, exit code 1, empty stdout, and no loader/API call.
- Extend the blank-override test to ensure the configured environment token is absent from output.
- Add a rejected-token test using a mocked HTTP 401 through the GraphQL client and mapper; require exit code 1, empty stdout, the rejection message, and no credentials in terminal output.
- Preserve explicit-token precedence and usage validation before authentication. Use fake credentials in fixtures.

## 4. Authenticate profile requests optionally

- Criteria: 1, 6, 7.
- Files: new `src/github/profile.ts`, `src/cli/profile.ts`, `tests/integration/profile.test.ts`.
- Dependencies: step 1.
- Extract only the existing HTTP helper, requests, and supporting types into `src/github/profile.ts`, because API access belongs in `src/github`. Keep formatting in the existing CLI module.
- Resolve the optional environment token with `resolveToken`. Send Authorization on both profile requests when configured; preserve anonymous requests when absent.
- Test first: verify authenticated headers for both requests, absent Authorization without a token, and a rejected profile token through `runCli` with mocked HTTP 401. Assert exit code 1, empty stdout, shared rejection wording, and no raw credential details.
- Preserve successful JSON fields, repository order and limit, timeout, table output, and existing non-authentication behavior.
- Do not add a literal `profile` subcommand, a profile token flag, dependencies, or a broader profile refactor.

## 5. Verify repository rejection through the CLI

- Criteria: 6, 7.
- File: `tests/integration/repo.test.ts`.
- Dependencies: step 1.
- Add a mocked HTTP 401 test passing the fake token received by the loader into `createGitHubClient`.
- Parameterize environment-token and explicit-token cases. Assert rejection wording, exit code 1, empty stdout, and no credential values from raw responses in terminal output.
- Automated tests must never contact GitHub.

## 6. Document authentication and shell setup

- Criteria: 1, 2, 3, 4.
- File: `README.md`.
- Dependencies: steps 3, 4, 5.
- Add an `Authentication` section describing optional authentication and higher REST rate limits for the default profile lookup and `repo`, and required authentication for GraphQL `activity`.
- Explain fine-grained PAT creation, expiration, public-repository read-only access, and avoiding unnecessary permissions. Verify against current official GitHub documentation.
- Provide copy-paste session and persistent setup examples for PowerShell, cmd, bash, and zsh. Explain new-terminal behavior for Windows persistent variables and the applicable shell startup files.
- Warn about shell history and process arguments with `--token`; prohibit committing tokens; use placeholders throughout.
- Manually inspect each documentation criterion and cross-check command/error descriptions. Replace the outdated claim that profile ignores `GITHUB_TOKEN`.
- Shell persistence is a user setup instruction; the CLI does not store tokens.

## 7. Verify and prepare delivery

- Criterion: 8, with regression verification of criteria 1–7.
- Files: no additional versioned files planned.
- Dependencies: steps 1–6.
- Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`; record TDD and check results.
- Exercise the built CLI for missing-token activity, rejection in all three commands with a deliberately fake token, and a successful anonymous public lookup. Check output and exit codes without exposing existing credentials. Distinguish network failures from implementation failures.
- Run the complete test audit, mutation testing only if Stryker is already configured, standard review, and the maestro's final verification. Stryker is currently absent; do not add it.
- Fetch and rebase onto `origin/main`, repeat verification if the code changes, push only the work branch, and open a PR with `Closes #10`. Merge remains with the author.

## Order and contracts

Order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7.

No changes to public metric types, Zod schemas, successful JSON shapes, command names, or flags. Error wording changes intentionally. The default profile lookup starts using optional `GITHUB_TOKEN`, while anonymous access remains supported.

No new dependencies. CLI token storage, OAuth, `.env` support, a literal `profile` command, and broader architecture changes are out of scope. All issue criteria are covered; there are no open product questions.

## Baseline evidence

Before implementation, typecheck, lint, and build pass. The existing suite passes: 16 test files, 132 tests.
