---
name: deep-code-review
description: Revisao rigorosa de manutenibilidade de um diff do GitMetrics - estrutura, simplicidade, camadas, tipos, abstracoes desnecessarias e crescimento de condicionais. Usada pelo reviewer no modo rigoroso ou quando o autor pedir uma revisao profunda de qualidade.
---

# Revisao profunda de qualidade

Escopo: **somente o diff** (`git diff <sha-base>...HEAD`). Nao critique codigo antigo que a mudanca nao tocou.
O objetivo e um codigo pequeno, direto e facil de explicar. "Funciona" nao basta para aprovar.

## Perguntas para cada mudanca relevante

1. **Da para apagar em vez de arrumar?** Existe um jeito de reformular a mudanca para sumirem ramos, helpers ou camadas?
2. **Camada certa?** Logica de métrica em `src/core`; Octokit so em `src/github`; formatacao em `src/output`; comando so faz parse, chamada e saida.
3. **Condicional avulsa?** `if` novo enfiado num fluxo existente para tratar um caso especial pede uma abstracao propria ou um modelo melhor.
4. **Abstracao que se paga?** Wrapper que so repassa chamada, classe ou factory para uso unico, interface com um unico implementador: indirecao sem ganho.
5. **Tipos honestos?** `any`, cast (`as`), opcional demais ou objeto de formato solto escondendo uma regra que deveria estar explicita em tipo ou schema `zod`.
6. **Duplicacao?** Helper novo que repete um que ja existe no repo.
7. **Orquestracao?** Chamadas independentes ao GitHub feitas em sequencia sem motivo (considere `Promise.all`, respeitando rate limit); estado atualizado pela metade quando uma falha acontece no meio.
8. **Tamanho?** Arquivo que passou de ~400 linhas neste diff ou funcao que nao cabe numa tela.

## Classificacao

**Bloqueia (PRECISA REVISAO):**
- condicional ad-hoc que embaralha um fluxo existente;
- logica na camada errada (ex. Octokit fora de `src/github`);
- `any` ou cast que esconde uma regra real;
- dependencia nova sem aprovacao.

**Nota (nao bloqueia):** nomes, tamanho, duplicacao pequena, abstracao questionavel, oportunidades de simplificar.

## Como reportar
- Poucos achados de alta conviccao, do mais estrutural ao mais cosmetico. Nada de enxurrada de nitpicks.
- Cada achado: `arquivo:linha`, o problema, e uma sugestao concreta de como simplificar.
- Tom direto e respeitoso. Se a mudanca deixa o codigo mais confuso, diga claramente.
