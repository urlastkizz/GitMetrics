# Issue #3: repository metrics command

Status: awaiting author approval before implementation.
Size: M (issue label). Workflow: medium path.
Branch: `feat/3-repo-command`.
Base SHA: `3b48e816d071fcadb593cb06ecdba81d4e8c1a61`.
Issue: https://github.com/urlastkizz/GitMetrics/issues/3

## Goal and acceptance criteria

As a developer, I want to see key metrics of a GitHub repository in the terminal.

1. Given a valid public repo, when I run `gitmetrics repo owner/name`, then I see stars, forks, open issues, open PRs, languages (with %) and the date of the last commit in a table.
2. Given the `--json` flag, when I run the command, then the same data is printed as valid JSON and nothing else.
3. Given an invalid argument (not `owner/name`), when I run the command, then I get a short usage error and exit code 2.
4. Given a repo that does not exist, when I run the command, then I get a friendly "not found" message and exit code 1.
5. Given no token and the rate limit reached, when I run the command, then I see when the limit resets and exit code 1.

Out of scope: caching, private repositories, other commands, and broad profile refactoring.

## Approved data decision

The author approved option A: use the first commit returned for the default branch and its committer date, normalized to UTC. Empty repositories return `lastCommitAt: null` in JSON and `No commits` in the table.

## Proposed contracts

- Add the `gitmetrics` executable, preserving `metrica` as an alias to `dist/index.js`.
- Register `repo <owner/name>` with `--json`, `--no-color`, and `--token <token>`.
- An explicit token overrides `GITHUB_TOKEN`; no token allows anonymous requests.
- Preserve the existing username command and its JSON output.
- Validate the repository argument and consumed API fields with zod.
- Errors write a useful English message to stderr, leave stdout empty, and use status 1. Invalid usage uses status 2. Never print tokens or raw stack traces.
- Successful JSON contains only the following object and a trailing newline:

```json
{
  "repository": "owner/name",
  "stars": 12,
  "forks": 2,
  "openIssues": 3,
  "openPullRequests": 1,
  "languages": [
    { "name": "TypeScript", "percentage": 75 },
    { "name": "JavaScript", "percentage": 25 }
  ],
  "lastCommitAt": "2026-01-02T03:04:05.000Z"
}
```

- Languages use byte counts divided by total bytes, rounded to two decimals and sorted by descending bytes, then name. Independent rounding may produce a sum slightly different from 100. An empty language response becomes `[]` and `No languages` in the table.
- GitHub's open issue count includes pull requests: subtract the fully paginated open PR count. Reject impossible inconsistent counts rather than emit negative values.
- An internal `RepositorySnapshot` carries API-derived inputs; a pure `RepositoryMetrics` transformation produces the shared table/JSON result.
- Compose the real GitHub loader in `src/index.ts` and inject it into the CLI. Core functions import neither HTTP clients nor terminal code.

## Dependency approval requested

No dependencies will be installed before plan approval.

| Package | Purpose | Registry size reported by planner | Native alternative |
| --- | --- | --- | --- |
| `@octokit/rest` | Required GitHub client, typed endpoints and pagination | Version 22.0.1: 8,276 direct unpacked bytes, excluding transitives | `fetch`, with manual pagination and HTTP handling |
| `zod` | Validate arguments and consumed API fields as required by project rules | Version 4.6.7: 6,148,944 unpacked bytes | Manual validators/type guards |

These figures come from the planner's `npm view` lookup and are not final bundle sizes. Reuse existing `commander`, `cli-table3`, and `picocolors`; do not replace the output stack in this task.

## Ordered subtasks

### 1. Dependencies and executable

- Files: `package.json`, `package-lock.json`.
- Criteria: 1, 2. Depends on: none.
- Add approved dependencies and `gitmetrics` bin while retaining `metrica`.
- Verification: both bins point to the same entry point; the existing profile JSON test remains green.

### 2. Optional authentication

- Files: `src/config/token.ts`, `tests/unit/config/token.test.ts`.
- Criteria: 1, 5. Depends on: none.
- Tests: explicit token overrides environment; environment is used when no override exists; no token returns undefined and permits anonymous access.
- Keep credentials out of all output and errors.

### 3. Pure repository metrics

- Files: `src/core/types.ts`, `src/core/metrics/repo.ts`, `tests/unit/core/repo.test.ts`.
- Criteria: 1, 2. Depends on: none.
- Tests: complete metrics and percentages; serializable output; PRs excluded from issues; language ordering and rounding; no language bytes; no commits; UTC normalization; inconsistent counts rejected.

### 4. GitHub client and error mapping

- Files: `src/github/client.ts`, `src/github/errors.ts`, `tests/unit/github/client.test.ts`.
- Criteria: 1, 4, 5. Depends on: 1.
- Tests: anonymous/authenticated clients; friendly 404; exhausted rate limit with UTC reset time; invalid authentication without token leakage; network failure; unrelated forbidden response.
- Recognize rate limits from HTTP status and metadata, including `x-ratelimit-reset`. If reset metadata is unavailable, say so without inventing a time. Use a finite timeout and avoid automatic retry delays.

### 5. Repository snapshot loader

- Files: `src/github/repo.ts`, `tests/unit/github/repo.test.ts`.
- Criteria: 1, 4, 5. Depends on: 1, 3, 4.
- Fetch repository metadata, language bytes, every page of open PRs, and one default-branch commit. Validate consumed fields with zod and return project-owned types.
- Tests: complete snapshot; all PR pages counted; default-branch committer date; empty repository; unrelated 409 remains an error; malformed response; 404/rate-limit propagation from repository requests without partial output.
- Distinguish the specific empty-repository response from other conflicts. Full PR pagination can require several requests; do not cap it and silently undercount.

### 6. Repository output

- Files: `src/output/repo.ts`, `tests/unit/output/repo.test.ts`.
- Criteria: 1, 2. Depends on: 3.
- Formatters return strings; CLI writes them.
- Tests: every metric rendered; one valid JSON document with equivalent data; `No commits`; `No languages`; two decimal places in table percentages; no ANSI when color is disabled.

### 7. Repository command

- Files: `src/cli/commands/repo.ts`, `tests/unit/cli/repo.test.ts`.
- Criteria: 1–5. Depends on: 2, 3, 6.
- Export `registerRepoCommand` with an injected loader. Validate `owner/name` before any API work; reject URLs, extra path segments, and spaces.
- Tests: table success; clean JSON success; invalid/missing argument status 2 without requests; missing repository status 1 on stderr; anonymous rate-limit reset status 1; help; token override; color disabled.
- Keep metrics calculations and Octokit out of the command.

### 8. CLI composition and integration

- Files: `src/cli/index.ts`, `src/index.ts`, `tests/integration/repo.test.ts`.
- Criteria: 1–5. Depends on: 4, 5, 7.
- Connect the GitHub loader at the composition root and preserve existing positional profile behavior.
- Mock API responses in integration tests; never use the real network in automated tests.
- Tests: full table flow; JSON-only flow; invalid argument status 2 before API access; 404 status 1; anonymous rate-limit status/reset; existing profile queries; JSON option before/after the subcommand.

### 9. Documentation and verification

- Files: `README.md`, `tests/integration/cli.test.ts`.
- Criteria: 1–5. Depends on: 1, 8.
- Document executable names, examples, token precedence, JSON fields, percentage calculation, UTC, empty repositories, and exit codes.
- Test root help includes the repository command. Verify documented JSON against integration coverage.
- Run typecheck, lint, format checking, tests, core coverage (at least 80%), and build.
- Run the built CLI for table and JSON with `octocat/Hello-World`; verify invalid argument exit status 2. Real smoke checks depend on network/rate availability; automated tests remain mocked.

## Delivery workflow

1. Obtain author approval of this plan and dependencies.
2. Delegate to `implementer`: TDD red → green by criterion; record failing/passing evidence; make focused Conventional Commits with `Refs #3`.
3. Delegate to `test_auditor` in complete mode: map all five criteria to tests; run mutation testing only if Stryker is configured.
4. Delegate to `reviewer` in standard mode.
5. Route findings back to implementer and repeat starting with test auditor, with at most two retries.
6. Maestro runs and reports typecheck, lint, tests, build, and the built command.
7. Fetch/rebase onto `origin/main`; repeat verification if the code changes.
8. Push only the working branch and create an English PR with `Closes #3`. The author performs the merge.

## Initial baseline

Before implementation, typecheck, lint, all 7 tests in 2 files, and build passed. No application code has been modified.
