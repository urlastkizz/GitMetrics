---
name: write-tests
description: Use ao escrever, corrigir ou revisar testes com Vitest - unitários do core, testes de comandos da CLI e mocks da API do GitHub.
---

# Testes com Vitest

- Local: `tests/unit/` (core, output) e `tests/integration/` (CLI + API mockada). Nome: `<arquivo>.test.ts`.
- Padrão **Arrange / Act / Assert**, um comportamento por teste. Nome descritivo: `returns 0 when there are no commits`.
- Core: sem mocks, só entradas e saídas. Cubra: caso feliz, vazio, borda de data, entrada inválida.
- GitHub: `vi.mock` no cliente. Fixtures em `tests/fixtures/*.json` (respostas reais reduzidas, sem dados sensíveis).
- CLI: execute o comando e cheque stdout, stderr e exit code.
- Sem `sleep`, sem rede, sem dependência de data atual (use `vi.useFakeTimers` / `vi.setSystemTime`).
- Meta: cobertura do `core` ≥ 80% (`npm run test:coverage`). Cobertura não substitui bons casos de borda.
- Teste que falha por motivo errado não vale: confirme que o teste realmente **falha** antes de implementar.
- Ao corrigir bug: primeiro escreva o teste que reproduz, depois corrija.
