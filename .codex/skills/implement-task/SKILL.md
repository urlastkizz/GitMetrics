---
name: implement-task
description: Orquestra a implementacao de uma tarefa (issue do GitHub) do GitMetrics de ponta a ponta - triagem por tamanho e delegacao aos agentes planner, implementer, test_auditor e reviewer. Use somente quando o autor pedir para implementar uma issue ou chamar $implement-task.
---

# Fluxo de implementacao (maestro)

Voce e o **maestro**: le a tarefa, escolhe o caminho e delega. **Nao escreve codigo nem teste.**
O unico arquivo que voce grava e o plano em `docs/plans/issue-<n>.md`.
Os agentes ficam em `.codex/agents/`: `planner`, `implementer`, `reviewer`, `test_auditor`.
Para delegar, peca explicitamente ao Codex para iniciar o agente pelo nome.

## 0. Triagem

1. Leia a issue: `gh issue view <n> --comments`.
2. Sem **criterios de aceite** numerados (formato "Dado..., quando..., entao...") -> pare e peca para completar.
3. Defina o tamanho. Use o label `size:S`, `size:M` ou `size:L` da issue; sem label, estime e **confirme com o autor**:

| Tamanho | Sinais | Caminho |
|---|---|---|
| S | ate 3 criterios, 1 a 3 arquivos, uma camada | `references/short-path.md` |
| M | 4 a 5 criterios, ou duas camadas (ex. core + cli) | `references/medium-path.md` |
| L | 6+ criterios, ou muda tipo publico / formato do `--json` / varios comandos | `references/large-path.md` |

Pedido explicito do autor ("use o caminho medio") vale mais que a tabela.
Leia **so** o arquivo do caminho escolhido.

## Regras comuns (valem em todos os caminhos)

- **Inicio:** `git fetch`; crie a branch `feat/<n>-<slug>` (ou `fix/`, `docs/`, `chore/`) a partir de `origin/main`; anote o SHA base com `git rev-parse HEAD`. Nunca trabalhe na `main`.
- **Delegacao:** o agente nao enxerga esta conversa. Cole no prompt: a issue inteira (objetivo, criterios, fora de escopo), o SHA base, o modo e, se houver, o plano.
- **Commits:** so o `implementer` commita codigo, em Conventional Commits, com `Refs #<n>` no corpo. Voce commita apenas planos.
- **Parada de agente:** se um agente devolver `PARE:`, mostre o motivo ao autor e espere. Se houver mudancas nao commitadas, mostre o `git status` e pergunte antes de descartar qualquer coisa.
- **Retentativas:** reprovacao do test_auditor, do reviewer ou do verify -> devolva os achados ao `implementer`. Depois da correcao, **refaca a partir do test_auditor**. No maximo 2 retentativas por tarefa; na terceira reprovacao, pare e mostre os achados.
- **Verify (seu, sempre por ultimo):** rode e mostre a saida de `npm run typecheck`, `npm run lint`, `npm test` e `npm run build`. Rode tambem o comando de verdade (ex. `node dist/index.js repo <owner/name>`) e confira a saida. Nunca diga "pronto" sem essa evidencia.
- **Fim:** `git fetch origin && git rebase origin/main`; se algo mudou, rode o verify de novo. Faca push **somente da branch de trabalho**, abra o PR com `gh pr create` (corpo com `Closes #<n>`, usando a skill `commit-and-pr`). O merge e do autor.
- **Resumo final** ao autor:
  ```
  Tarefa #<n> (tamanho <S|M|L>)
  TDD:          <n testes, arquivos alterados>
  Testes:       criterios cobertos <x>/<y>, mutation <score% | nao executado | nao configurado>
  Revisao:      <APROVADO | APROVADO COM NOTAS | PRECISA REVISAO>
  Verify:       <comandos rodados e resultado>
  PR:           <url>
  O que voce deve entender para explicar em entrevista: <3 pontos>
  ```
