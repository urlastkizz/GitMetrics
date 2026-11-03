# Issue #9: Prepare the package for npm publishing

Size: M (issue label). Branch: `chore/9-prepare-npm-package`.
Base: `460711c8255a051b0853681f543e30753a2c067d`.
Status: approved by the author on 2026-11-03.

## Goal and scope

Enable installation with `npx gitmetrics repo owner/name` and a global npm
installation without cloning this repository. Prepare the package without
publishing it. The executable command remains `gitmetrics`.

`npm view gitmetrics name version --json` returned exit code 1 with an E404
response from `https://registry.npmjs.org/gitmetrics`, so the final package name
is `gitmetrics`, following the issue's naming rule.

## Subtask 1: Complete the npm package contract

- Acceptance criteria: 1 and 5.
- Files: update `package.json`; create `tests/integration/package.test.ts`.
- Dependencies: none.
- Include all required metadata: name, version, description, keywords, license,
  repository, bugs, homepage, bin, engines, and the exact files allowlist
  `["dist", "README.md", "LICENSE"]`.
- Keep version `1.0.0`, MIT licensing, and Node `>=22.13.0`.
- Set `prepublishOnly` to
  `npm run typecheck && npm run lint && npm test && npm run build`.
- Test `defines the public package metadata and distributable allowlist`.
- Test `runs all publication checks in order` using a temporary fixture with
  controlled scripts and the actual lifecycle hook.
- Test `aborts publication checks when <stage> fails` for each stage, checking
  nonzero exit and that subsequent stages never run. Never invoke `npm publish`.
- No new dependencies. Update `package-lock.json` only if its metadata is
  affected; do not regenerate unrelated transitive dependency versions.

## Subtask 2: Verify the built artifact and npm package contents

- Acceptance criteria: 2, 3, and 4.
- Files: continue `tests/integration/package.test.ts`.
- Depends on subtask 1.
- Test `preserves the executable shebang in the production build`: build once,
  then check that the first line of `dist/index.js` is `#!/usr/bin/env node`.
- Test `packs only runtime artifacts and public documentation`: run
  `npm pack --dry-run --json --ignore-scripts`; require `package.json`,
  `README.md`, `LICENSE`, and the executable; allow only these and `dist/**`;
  reject tests, test source maps, `.env*`, and agent configuration directories.
- Perform a separate real acceptance check: create a tarball with `npm pack`,
  install it in an empty temporary directory, then run its installed
  `gitmetrics --version` and `gitmetrics --help` shims. Check successful exits,
  the manifest version, and expected help. Record commands and output.
- Keep registry-dependent installation outside the offline test suite.
- Use native Node APIs for temporary files and cross-platform process execution.
- `src/index.ts` already has the shebang, and `tsup.config.ts` already builds a
  single entry and cleans output. Change neither unless verification requires it.
- Do not publish or install globally on the author's machine.

## Subtask 3: Document installation for package consumers

- Acceptance criterion: 6.
- Files: update `README.md`.
- Depends on subtask 1.
- Add an Installation section showing
  `npx gitmetrics repo octocat/Hello-World --json`,
  `npm install -g gitmetrics`, and
  `gitmetrics repo octocat/Hello-World`.
- Review the examples against the final package name.
- Clarify that registry installation becomes available after manual publication.
- Keep requirements and usage consistent: cloning and Git are development
  requirements; preserve the existing source-based development workflow.
- Do not change token documentation, metric examples, or existing commands.

## Subtask 4: Validate and deliver

- Acceptance criterion: 7 and final confirmation of criteria 1 through 6.
- Files: no additional files.
- Depends on subtasks 1, 2, and 3.
- Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, and
  `npm run format:check` (required by CI).
- Verify packaging and installation, plus `node dist/index.js --version` and
  `node dist/index.js --help`.
- Implementer records meaningful red-to-green tests and commits with `Refs #9`.
- Run the full test audit, then standard review, then the maestro's final verify.
- Mutation testing is not configured; report this without adding Stryker.
- Fetch and rebase on `origin/main`; repeat verification if the base changed.
- Push only the working branch and open a PR with `Closes #9`.

## Order, contracts, and exclusions

Order: 1 -> 2 -> 3 -> 4.

Contracts: package metadata and publication hook only. No changes to public
TypeScript types, Zod schemas, commands, or JSON output.

Excluded by the issue: actual npm publication, automated releases, changelog,
and token setup documentation. Merge remains the author's responsibility.

## Baseline evidence

Before implementation, typecheck, lint, all 140 tests across 16 test files, and
the production build passed on the base commit.
