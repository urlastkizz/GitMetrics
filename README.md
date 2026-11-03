# GitMetrics

[![npm version](https://img.shields.io/npm/v/@urlastkizz/gitmetrics)](https://www.npmjs.com/package/@urlastkizz/gitmetrics)
[![CI](https://github.com/urlastkizz/GitMetrics/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/urlastkizz/GitMetrics/actions/workflows/ci.yml?query=branch%3Amain)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

GitMetrics is a TypeScript CLI for exploring GitHub from your terminal: `profile` shows a user's public profile and five newest repositories, `repo` summarizes a public repository, and `activity` measures recent user contributions. The profile lookup is the default command, invoked as `gitmetrics <username>`; there is no literal `profile` subcommand.

Built to practice TypeScript, API integration, pure metric calculations, automated testing, and collaboration through Git branches and pull requests.

[Authentication](#authentication): only `activity` requires a GitHub token; profile and public repository queries can run anonymously.

[Quick start](#quick-start) · [Installation](#installation) · [Usage](#usage) · [Authentication](#authentication) · [Development](#development)

## Quick start

Run a public repository query without cloning, building, or installing globally:

```sh
npx @urlastkizz/gitmetrics repo microsoft/vscode
```

Expected output, captured from the published **0.1.1** package on **2026-11-03** (terminal colors omitted):

```text
┌───────────────────┬──────────────────────────┐
│ Metric            │ microsoft/vscode         │
├───────────────────┼──────────────────────────┤
│ Stars             │ 194526                   │
├───────────────────┼──────────────────────────┤
│ Forks             │ 44393                    │
├───────────────────┼──────────────────────────┤
│ Open issues       │ 18978                    │
├───────────────────┼──────────────────────────┤
│ Open PRs          │ 3090                     │
├───────────────────┼──────────────────────────┤
│ Languages         │ TypeScript: 96.48%       │
│                   │ CSS: 1.44%               │
│                   │ Rust: 0.70%              │
│                   │ JavaScript: 0.51%        │
│                   │ HTML: 0.31%              │
│                   │ Other: 0.56%             │
├───────────────────┼──────────────────────────┤
│ Last commit (UTC) │ 2026-11-03T08:45:50.000Z │
└───────────────────┴──────────────────────────┘
```

All data examples below were also captured from the published **0.1.1** package against public GitHub data on that date. Counts and activity dates change when you run the commands again. Queries paginate GitHub results, so large repositories can take longer; anonymous requests may reach GitHub's rate limit. See [Authentication](#authentication) to use a token.

## Requirements

- **Node.js >=22.13.0**, matching `package.json`, and npm.
- Internet access to install the package and query GitHub.
- A GitHub token for `activity`. Profile queries and public repository queries can run without one.

## Installation

Use `npx` to run the published package without installing globally:

```sh
npx @urlastkizz/gitmetrics repo octocat/Hello-World --json
```

Or install the CLI globally:

```sh
npm install -g @urlastkizz/gitmetrics
gitmetrics repo octocat/Hello-World
```

### Run from source

For local development, Git is also required. Clone the project, install its
locked dependencies, build, and query a public repository:

```sh
git clone https://github.com/urlastkizz/GitMetrics.git
cd GitMetrics
npm ci
npm run build
node dist/index.js repo octocat/Hello-World --json
```

## Authentication

The default **profile** lookup (`gitmetrics <username>`) and **repo** can run anonymously. Set `GITHUB_TOKEN` to authenticate them for a higher REST API rate limit. **activity** requires a token because it uses GitHub's GraphQL API. For `repo` and `activity`, `--token <token>` overrides `GITHUB_TOKEN`; profile reads the environment variable only.

### Create a token

Create a fine-grained personal access token using [GitHub's token instructions](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#creating-a-fine-grained-personal-access-token):

1. Open GitHub **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
2. Name it (for example, `GitMetrics`), choose a short expiration, and select your account as the resource owner.
3. Under **Repository access**, choose **Public repositories** (read-only). Fine-grained tokens already include read-only access to public repositories; do not grant private repository access or additional write/account permissions for these public queries.
4. Generate the token and copy it into your shell configuration below. Replace `YOUR_TOKEN` with its value. Renew or replace it after expiration.

### Configure your shell

**PowerShell — current session:**

```powershell
$env:GITHUB_TOKEN = 'YOUR_TOKEN'
```

**PowerShell on Windows — permanent, for your user:**

```powershell
[Environment]::SetEnvironmentVariable('GITHUB_TOKEN', 'YOUR_TOKEN', 'User')
```

**cmd — current session:**

```bat
set "GITHUB_TOKEN=YOUR_TOKEN"
```

**cmd — permanent, for your Windows user:**

```bat
setx GITHUB_TOKEN "YOUR_TOKEN"
```

The Windows permanent settings apply to future terminals; they do not update the current session. Close and reopen your terminal application, or also run its current-session command. See [PowerShell environment variables](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_environment_variables) and [setx](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/setx).

**bash/zsh — current session:**

```sh
export GITHUB_TOKEN='YOUR_TOKEN'
```

**bash — permanent for interactive shells:**

```bash
printf '\n%s\n' "export GITHUB_TOKEN='YOUR_TOKEN'" >> ~/.bashrc
source ~/.bashrc
```

**zsh — permanent for interactive shells:**

```zsh
printf '\n%s\n' "export GITHUB_TOKEN='YOUR_TOKEN'" >> "${ZDOTDIR:-$HOME}/.zshrc"
source "${ZDOTDIR:-$HOME}/.zshrc"
```

Run the permanent setup once; edit the existing entry when replacing a token. Bash login shells read the first available `~/.bash_profile`, `~/.bash_login`, or `~/.profile` instead of `~/.bashrc`. Ensure that login file sources `~/.bashrc`, or put the export in that login file. PowerShell on macOS/Linux can put its session assignment in `$PROFILE` instead of using Windows user environment settings. See the [Bash startup rules](https://www.gnu.org/software/bash/manual/html_node/Bash-Startup-Files.html) and [zsh startup rules](https://github.com/zsh-users/zsh/blob/master/Doc/Zsh/files.yo).

### Keep tokens private

Never commit tokens, including in scripts, shell startup files, or screenshots. `--token` can expose the value in shell history and process arguments; prefer an environment variable. The setup commands above can also enter shell history, and permanent configuration stores the value in your Windows user environment or shell startup file. Keep that configuration private. GitMetrics itself does not store tokens or load `.env` files.

A missing activity token produces setup commands and a link to this section before any request. A rejected token (HTTP 401) produces a different message: `GitHub rejected the token. It may be invalid or expired.` Both failures exit with `1` without printing the token.

## Usage

After installing globally, use `gitmetrics` as shown below. Without a global install, replace `gitmetrics` with `npx @urlastkizz/gitmetrics`. For a local build, use `node dist/index.js`. To run the TypeScript source, use `npm start --`; for example, `npm start -- repo octocat/Hello-World --json` forwards the arguments after `--` to the CLI. The npm package is named `@urlastkizz/gitmetrics`; the executable is named `gitmetrics`.

### Profile (default command)

Show a public profile and up to five repositories, ordered by creation date from newest to oldest:

```sh
gitmetrics <username> [--json]
gitmetrics octocat
gitmetrics octocat --json
```

Pass a username without `@` or a profile URL. Options:

| Flag            | Purpose                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------ |
| `--json`        | Print one JSON object containing `profile` and `repositories`, using GitHub API response fields. |
| `-h, --help`    | Show CLI help.                                                                                   |
| `-V, --version` | Show the installed version.                                                                      |

Actual output excerpt from `gitmetrics octocat` (the repository table follows the card):

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ GITHUB PROFILE · @octocat                                                                        │
├────────────────────────┬─────────────────────────────────────────────────────────────────────────┤
│ Name                   │ The Octocat                                                             │
├────────────────────────┼─────────────────────────────────────────────────────────────────────────┤
│ Bio                    │ Not provided                                                            │
├────────────────────────┼─────────────────────────────────────────────────────────────────────────┤
│ Followers              │ 24,910                                                                  │
├────────────────────────┼─────────────────────────────────────────────────────────────────────────┤
│ Public repositories    │ 8                                                                       │
└────────────────────────┴─────────────────────────────────────────────────────────────────────────┘
```

The repository table includes name, primary language, stars, forks, and link. Terminal output supports colors and adapts column widths. Profile queries use `GITHUB_TOKEN` when configured, otherwise they run anonymously.

### Repository metrics

```sh
gitmetrics repo <owner/name> [--languages <n>] [--json] [--no-color] [--token <token>]
gitmetrics repo octocat/Hello-World
gitmetrics repo octocat/Hello-World --json
gitmetrics repo microsoft/TypeScript --languages 1 --no-color
```

| Flag              | Purpose                                              |
| ----------------- | ---------------------------------------------------- |
| `--json`          | Print repository metrics as one JSON object.         |
| `--languages <n>` | Show the top 1–20 table languages; default: `5`.     |
| `--no-color`      | Disable colors in the default table output.          |
| `--token <token>` | Override `GITHUB_TOKEN`; authentication is optional. |
| `-h, --help`      | Show command help.                                   |

Actual output from `gitmetrics repo octocat/Hello-World --json`:

```json
{
  "repository": "octocat/Hello-World",
  "stars": 3897,
  "forks": 7358,
  "openIssues": 6151,
  "openPullRequests": 1369,
  "languages": [],
  "lastCommitAt": "2012-03-06T23:06:50.000Z"
}
```

The default table shows the same metrics. Open issues exclude pull requests; all open PR pages are counted. Languages are sorted by descending bytes, then name. The table shows the top five languages by default and groups the rest into a final `Other` row. Use `--languages <n>` to select an integer from 1 through 20; invalid values exit with code `2`. No `Other` row appears when all languages fit within the limit.

Table percentages are shown to two decimals and balanced to total exactly 100% for nonempty results. The rounding difference is applied to the largest displayed row, including `Other`, with ties resolved by existing order. JSON always keeps every language, regardless of `--languages`, with the original independently rounded percentages (bytes divided by total bytes); its sum can differ slightly from 100. An empty language list appears as `[]` in JSON or `No languages` in the table.

The last commit date comes from the default branch's latest commit, normalized to UTC. An empty repository uses `lastCommitAt: null` or `No commits`. Private repositories and caching are outside this command's scope.

### User activity

```sh
gitmetrics activity <user> [--days <n>] [--json] [--no-color] [--token <token>]
gitmetrics activity octocat
gitmetrics activity octocat --days 7 --json
```

Activity requires a GitHub token available through `GITHUB_TOKEN` or the explicit token option. The explicit option takes precedence. Keep credentials out of screenshots, shared output, and committed files.

| Flag              | Purpose                                                         |
| ----------------- | --------------------------------------------------------------- |
| `--days <n>`      | Select 1–365 UTC calendar days, including today; default: `30`. |
| `--json`          | Print activity metrics as one JSON object.                      |
| `--no-color`      | Disable colors in the default table output.                     |
| `--token <token>` | Override `GITHUB_TOKEN`; authentication is required.            |
| `-h, --help`      | Show command help.                                              |

Actual output from `gitmetrics activity octocat --days 7 --json`, with authentication already available:

```json
{
  "user": "octocat",
  "days": 7,
  "startDate": "2026-10-28",
  "endDate": "2026-11-03",
  "totalContributions": 0,
  "activeDays": 0,
  "busiestDay": null
}
```

The command uses GitHub's GraphQL contribution calendar. It counts contributions exposed for the queried user and token, rather than repository commits. The period starts at UTC midnight on the first day and ends at the query's captured current instant; today's count is partial.

Active days have at least one contribution. The busiest day has the highest daily count, with ties resolved to the most recent date. A period without contributions returns both totals as `0` and `busiestDay: null` (or `No contributions` in the table). Streaks, charts, contribution breakdowns, and caching are outside this command's scope.

### Help and errors

```sh
gitmetrics --help
gitmetrics repo --help
gitmetrics activity --help
gitmetrics --version
```

Successful queries, help, and version exit with `0`; failed queries exit with `1`; invalid CLI usage exits with `2`. Query errors go to stderr, leaving stdout empty. Requests use a 15-second timeout without automatic retries.

Repository and activity queries report rejected credentials, rate limits, missing resources, and network failures with useful error messages. Rate-limit errors include the UTC reset time when GitHub supplies it. Profile queries report rejected credentials explicitly and otherwise use a general query error message. Activity rejects partial GraphQL responses with errors and reports missing authentication before making a request.

## Development

```sh
npm run typecheck
npm run lint
npm run format:check
npm test
npm run test:coverage
npm run build
```

Tests use mocked GitHub responses and run without network access. GitHub Actions checks Node.js 22, 24, and 26.

```text
src/
  index.ts          # Executable entry point
  cli/              # Commander commands and current profile implementation
  core/             # Pure metric calculations and project types
  github/           # API clients, validation, pagination, and errors
  output/           # Repository and activity table/JSON formatters
  config/           # Token resolution
  utils/            # Reserved for shared helpers
tests/
  integration/      # CLI smoke tests and mocked GitHub queries
  unit/             # Metrics, clients, formatters, configuration, and commands
```

Repository and activity commands separate parsing, metric calculation, API access, and presentation. Profile requests also live in `src/github`; its existing tables remain in `src/cli/profile.ts`.

The stack includes TypeScript in strict mode, Node.js, Commander, Octokit, Zod, picocolors, cli-table3, Vitest, and tsup. See [CONTRIBUTING.md](CONTRIBUTING.md) for the existing contribution workflow.

## License

MIT. See [LICENSE](LICENSE).
