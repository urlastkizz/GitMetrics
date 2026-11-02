---
name: add-cli-command
description: Use ao criar ou alterar um comando da CLI (ex. gitmetrics repo, gitmetrics activity), incluindo argumentos, flags, help e saída. Não use para lógica de métricas.
---

# Adicionar um comando à CLI

Regra: o comando só faz **parse + chamada + formatação**. Lógica fica em `src/core`.

1. Crie `src/cli/commands/<nome>.ts` exportando uma função `register<Nome>Command(program: Command)`.
2. Defina argumentos e flags com `commander`. Toda flag tem descrição clara em inglês.
3. Flags padrão em todo comando de dados: `--json` (saída máquina), `--no-color`, `--token <token>` (sobrescreve `GITHUB_TOKEN`).
4. Valide a entrada com `zod` (ex. `owner/name` precisa bater com `^[\w.-]+\/[\w.-]+$`). Erro de uso = mensagem curta + exit code 2.
5. Fluxo: validar entrada → obter token via `src/config` → chamar função do `core` → passar resultado ao formatter em `src/output`.
6. Erros esperados (token ausente, repo inexistente, rate limit) viram mensagem amigável + exit code 1. Nunca mostre stack trace por padrão; só com `--debug`.
7. Registre o comando em `src/cli/index.ts`.
8. Teste: chame o comando com argumentos falsos e verifique stdout, stderr e exit code (mock do `core`).
9. Atualize a seção de uso do README com um exemplo real de saída.

Commit sugerido: `feat(cli): add <nome> command`.
