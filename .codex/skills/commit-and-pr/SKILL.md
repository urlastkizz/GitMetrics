---
name: commit-and-pr
description: Use ao preparar commits, mensagens, branch ou descrição de Pull Request, ou ao finalizar uma tarefa para entrega.
---

# Commits e PRs

1. Nunca commite na `main`. Branch: `feat/`, `fix/`, `docs/`, `chore/`, `refactor/`, `test/` + nome-curto-em-kebab-case.
2. Antes de commitar rode `npm run typecheck && npm run lint && npm test && npm run build`. Se falhar, corrija primeiro.
3. Commits em inglês, Conventional Commits: `tipo(escopo): resumo no imperativo` (até 72 caracteres). Corpo opcional explicando o **porquê**.
4. Um assunto por commit. Mudanças de formatação ou refactor separadas de features.
5. `git diff --staged` antes de commitar: sem `console.log`, sem arquivos aleatórios, sem segredos.
6. Descrição do PR em inglês:
   - **What**: o que mudou
   - **Why**: motivo
   - **How to test**: comandos exatos
   - **Screenshots/Output**: saída do terminal quando relevante
   - **Checklist**: testes, docs, breaking changes
7. PR pequeno (idealmente < 400 linhas). Se ficou grande, sugira dividir.
8. Ao final, resuma para o autor o que foi feito e o que ele deveria entender para explicar em entrevista.
