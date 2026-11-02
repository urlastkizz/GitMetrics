---
name: add-metric
description: Use ao implementar uma nova métrica do GitHub (commits por período, streak, tempo de merge de PR, linguagens, taxa de issues fechadas etc.) na camada core.
---

# Adicionar uma métrica

Métricas vivem em `src/core/metrics/<nome>.ts` e são **funções puras**: recebem dados já buscados e devolvem um resultado tipado. Nada de HTTP, `console.log` ou `process.exit` aqui.

1. Defina antes, por escrito: o que a métrica mede, a fórmula e os casos de borda (lista vazia, datas iguais, fuso horário, bots).
2. Tipos de entrada e saída em `src/core/types.ts` (ou arquivo da métrica). Sem `any`.
3. **Escreva primeiro o teste** (`tests/unit/core/<nome>.test.ts`) com fixtures pequenas e casos de borda.
4. Implemente a função. Datas sempre em UTC; use `Date` nativo ou `date-fns` (justifique antes de instalar).
5. Se precisar de dados novos da API, use a skill `github-api-client` para criar a busca em `src/github`, separada da métrica.
6. Exponha a métrica por um comando (skill `add-cli-command`) só depois de testada.
7. Documente no README: nome, fórmula, exemplo de saída.

Checklist: determinística, sem efeitos colaterais, cobertura dos casos de borda, nome claro.

Commit sugerido: `feat(core): add <nome> metric`.
