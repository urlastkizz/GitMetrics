# Contributing

Use Node.js 22.13 or newer and npm. CI checks Node.js 22, 24, and 26.

```sh
npm ci
npm start -- --help
npm start -- octocat
npm start -- octocat --json
```

Create a focused branch (`feat/`, `fix/`, `docs/`, or `chore/`) and use English
Conventional Commits. Keep each commit focused on one subject.

Before opening a pull request, run:

```sh
npm run typecheck
npm run lint
npm run format:check
npm test
npm run test:coverage
npm run build
node dist/index.js --version
node dist/index.js --help
```

Use `npm run dev -- octocat` while editing and `npm run format` to format files.

The executable is named `metrica`. `npm start -- <username>` keeps the existing
profile query; `--json` prints its raw profile and repository responses as JSON.
Usage errors exit with code 2; query failures exit with code 1.

CLI parsing lives in `src/cli`. The existing profile implementation remains in
`src/cli/profile.ts` until a separate task extracts API access and presentation.
Future code belongs in `src/core` (pure metrics), `src/github` (API access),
`src/output` (formatters), and `src/config` (configuration).

Tests must run without network access. Add focused tests for behavior changes and
describe the change, its reason, and validation in the pull request.

Never commit tokens or `.env` files. Authentication is not implemented yet;
`.env.example` only reserves the future variable name.
