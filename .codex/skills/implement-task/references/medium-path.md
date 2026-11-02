# Caminho medio (tamanho M)

O risco aqui e entender a tarefa errado. O plano expoe isso antes de existir codigo.

1. **planner**: plano com subtarefas, arquivos e testes por criterio.
2. Grave o plano em `docs/plans/issue-<n>.md` e commite (`docs: add plan for #<n>`, com `Refs #<n>`).
3. **Espere a aprovacao do autor.** Mostre o plano e as perguntas em aberto.
4. **implementer**: TDD seguindo o plano (cole o plano no prompt).
5. **test_auditor**, modo `completo`: criterio -> teste, mais mutation se o Stryker estiver configurado.
6. **reviewer**, modo `padrao`.
7. **Verify** (voce) e fim, conforme as regras comuns do SKILL.md.
