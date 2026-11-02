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

The repository is named `GitMetrics`, the npm package is `gh-metrics-cli`, and the executable is `metrica`.

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

The executable also accepts `--help` and `--version`. When installed as a package, its command name is `metrica`.

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

Requests use public data without authentication. The current implementation does not read `GITHUB_TOKEN` or access private repositories. GitHub API rate limits still apply; rate-limit and network failures currently use the general query error message.

## Development

```text
src/
  index.ts          # Executable entry point
  cli/              # Argument parsing and current profile implementation
  core/             # Reserved for pure metric calculations
  github/           # Reserved for API access
  output/           # Reserved for formatters
  config/           # Reserved for configuration
  utils/            # Reserved for shared helpers
tests/
  integration/      # CLI smoke tests and mocked GitHub queries
  unit/             # Reserved for pure metric tests
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
- Optional authentication with `GITHUB_TOKEN`.
- Separate API access, metric calculations, and output formatting.
- Expand tests as metrics and error handling are added.

## License

MIT. See [LICENSE](LICENSE).
