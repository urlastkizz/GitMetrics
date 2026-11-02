# GitMetrics

A TypeScript CLI for exploring public GitHub profiles and their five newest repositories from the terminal, with colored cards, tables, and JSON output.

Built to practice TypeScript, asynchronous API requests, automated testing, and collaboration through Git branches and pull requests.

## Features

- Profile card with name, bio, followers, and public repository count.
- Up to five public repositories, ordered from newest to oldest by **creation date**.
- Repository name, primary language, stars, forks, and link.
- Terminal tables with colors and numbers formatted for Brazilian Portuguese.
- JSON output for scripts, plus help and version options.
- Messages for missing profile fields, empty repository lists, and failed requests.

## Requirements

- Node.js 22.13 or newer and npm. CI checks Node.js 22, 24, and 26.
- Git to clone the repository.
- Internet access to query the public GitHub API.

## Installation

```sh
git clone https://github.com/urlastkizz/GitMetrics.git
cd GitMetrics
npm ci
```

The repository is named `GitMetrics`, the npm package is `gh-metrics-cli`, and the executables are `gitmetrics` and its alias `metrica`.

## Usage

Pass a GitHub username without `@` or a profile URL:

```sh
npm start -- octocat
npm start -- octocat --json
npm start -- --help
npm start -- --version
```

Replace `octocat` with the user you want to query. The `--` separator forwards the following arguments to the CLI.

To run the compiled executable:

```sh
npm run build
node dist/index.js octocat
node dist/index.js octocat --json
```

The executable also accepts `--help` and `--version`. When installed as a package, use `gitmetrics` or `metrica`.

### Repository metrics

```sh
gitmetrics repo octocat/Hello-World
gitmetrics repo octocat/Hello-World --json
gitmetrics repo octocat/Hello-World --no-color
npm start -- repo octocat/Hello-World
node dist/index.js repo octocat/Hello-World --json
```

The table shows stars, forks, open issues (excluding pull requests), open PRs, language percentages, and the last commit date. For example, fictional values:

```text
Metric              owner/name
Stars               12
Forks               2
Open issues         3
Open PRs            1
Languages           TypeScript: 75.00%
                    JavaScript: 25.00%
Last commit (UTC)   2026-01-02T03:04:05.000Z
```

`--json` prints only a JSON object and a newline, with the same metrics:

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

Language percentages are bytes divided by total bytes, rounded independently to two decimals; their sum can differ slightly from 100. Languages are sorted by descending bytes, then name. An empty language response produces `[]` in JSON and `No languages` in the table.

The last commit is the first commit returned for the default branch, using its committer date normalized to UTC. An empty repository produces `lastCommitAt: null` and `No commits` in the table. All open PR pages are counted before subtracting PRs from GitHub's combined issue count; inconsistent counts produce a retry message.

Repository queries use `--token <token>` before `GITHUB_TOKEN`, or anonymous access when neither is set. Tokens are optional and never printed. Requests have a 15-second timeout without automatic retries. Rate-limit errors report the UTC reset time when GitHub supplies it. Invalid usage exits with `2`; failed queries exit with `1` on stderr and leave stdout empty. Successful queries exit with `0`. Private repositories and caching are outside this command's scope.

### Example output

Illustrative output with fictional values. Terminal output also includes colors; column widths adapt to the terminal. The current table labels and query errors are in Brazilian Portuguese.

```text
┌────────────────────────┬───────────────────────────┐
│ PERFIL DO GITHUB · @example                         │
├────────────────────────┼───────────────────────────┤
│ Nome                   │ Example Person            │
│ Bio                    │ Learning TypeScript       │
│ Seguidores             │ 120                       │
│ Repositórios Públicos  │ 1                         │
└────────────────────────┴───────────────────────────┘

REPOSITÓRIOS MAIS RECENTES · por data de criação
┌────────────┬────────────┬──────────┬───────┬────────────────────────────────────────────┐
│ Nome       │ Linguagem  │ Estrelas │ Forks │ Link                                       │
│            │ Principal  │          │       │                                            │
├────────────┼────────────┼──────────┼───────┼────────────────────────────────────────────┤
│ GitMetrics │ TypeScript │       12 │     2 │ https://github.com/example/GitMetrics       │
└────────────┴────────────┴──────────┴───────┴────────────────────────────────────────────┘
```

### JSON output

`--json` returns an object containing `profile` and `repositories`, using the original GitHub API response fields. The repository list is still limited to five entries.

## How it works

Commander parses the username and options. The CLI then sends two requests in parallel:

```text
GET https://api.github.com/users/{username}
GET https://api.github.com/users/{username}/repos?type=owner&sort=created&direction=desc&per_page=5
```

Each request has a 15-second timeout. Missing usernames and invalid options exit with code `2`; failed queries exit with code `1`. Successful queries, help, and version output exit with code `0`.

Profile requests use public data without authentication. Profile queries do not read `GITHUB_TOKEN`; their rate-limit and network failures use the general query error message. Repository queries use the separate authenticated or anonymous client described above.

## Development

```text
src/
  index.ts          # Executable entry point
  cli/              # Argument parsing and current profile implementation
  core/             # Pure repository metric calculations and project types
  github/           # Octokit client, validation, pagination, and errors
  output/           # Repository table and JSON formatting
  config/           # Optional token resolution
  utils/            # Reserved for shared helpers
tests/
  integration/      # CLI smoke tests and mocked GitHub queries
  unit/             # Core, client, formatter, configuration, and command tests
.github/workflows/  # CI checks
```

The current profile module still contains API access and presentation. Future extraction will separate those responsibilities as metrics are added.

```sh
npm run typecheck
npm run lint
npm run format:check
npm test
npm run test:coverage
npm run build
```

Tests run without network access. To try a real query, use `npm start -- octocat`; to rerun automatically while editing, use `npm run dev -- octocat`.

The stack includes TypeScript in strict mode, Node.js with native `fetch`, Commander, picocolors, cli-table3, tsx, ESLint, Prettier, Vitest, and tsup. GitHub Actions runs the checks on pushes and pull requests.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the branch, commit, and verification workflow.

## Next steps

- Aggregate stars, forks, and languages across paginated repositories.
- Separate API access, metric calculations, and output formatting.
- Expand tests as metrics and error handling are added.

## License

MIT. See [LICENSE](LICENSE).
