# Caminho grande (tamanho L)

Antes de tudo, pergunte: a tarefa e **grande** (muito trabalho, partes independentes) ou **incerta** (ninguem sabe como fazer)? Se for incerta, pare e proponha uma investigacao curta (prototipo ou leitura da documentacao da API) e uma nova divisao da issue. Mais agentes sobre uma tarefa incerta so produzem retrabalho.

## Plano (nao implemente nada nesta fase)

1. **planner**: plano com subtarefas (criterios cobertos, arquivos, dependencias).
2. **reviewer**, modo `plano`: critica o plano.
3. Com critica bloqueante, chame o **planner** de novo com o plano e a critica, uma vez so. Se ainda houver bloqueio, mostre os dois ao autor.
4. Grave o plano final em `docs/plans/issue-<n>.md` e commite.
5. **Espere a aprovacao do autor.**

## Execucao (sequencial)

6. Para cada subtarefa, na ordem do plano:
   - anote o SHA de inicio da subtarefa;
   - **implementer** (so a subtarefa);
   - **test_auditor**, modo `subtarefa`: so os criterios dela, contra o SHA de inicio, sem mutation.
7. **test_auditor**, modo `completo`, na tarefa inteira contra o SHA base. A mutation roda uma vez so, aqui.
8. **reviewer**, modo `rigoroso`, na branch inteira contra o SHA base (aplica a skill `deep-code-review`).
9. **Verify** (voce) e fim, conforme as regras comuns do SKILL.md.

Tudo roda em sequencia. Quando o fluxo estiver redondo, vale testar paralelizar subtarefas com arquivos disjuntos.
