---
name: bootstrap-project
description: Use ao configurar o projeto do zero ou refazer a base - package.json, TypeScript strict, ESLint, Prettier, Vitest, tsup, scripts npm e CI. Não use para adicionar features.
---

# Bootstrap do projeto GitMetrics

1. Confirme com o autor: nome do pacote, licença (padrão MIT), Node LTS.
2. Inicialize: `npm init`, `"type": "module"`, campo `bin` apontando para `dist/index.js`, `engines.node`.
3. Instale (justifique cada uma em 1 linha): `commander`, `@octokit/rest`, `zod`, `chalk`, `cli-table3`.
   Dev: `typescript`, `tsup`, `vitest`, `eslint`, `typescript-eslint`, `prettier`, `@types/node`.
4. `tsconfig.json` com `strict: true`, `noUncheckedIndexedAccess: true`, `moduleResolution: "Bundler"`.
5. Scripts npm obrigatórios: `build`, `dev`, `typecheck`, `lint`, `format`, `test`, `test:coverage`.
6. Crie a estrutura de pastas definida no AGENTS.md (`src/cli`, `src/core`, `src/github`, `src/output`, `src/config`, `tests/`).
7. Crie `.gitignore` (node_modules, dist, .env, coverage), `.env.example`, `LICENSE`.
8. Crie `.github/workflows/ci.yml`: checkout, setup-node (cache npm), `npm ci`, typecheck, lint, test, build, rodando em Node 20 e 22.
9. Crie um comando `gitmetrics --version` de verdade e um teste simples para provar que tudo funciona.
10. Rode `npm run typecheck && npm run lint && npm test && npm run build` e mostre a saída.

Commit sugerido: `chore: bootstrap project tooling`.
