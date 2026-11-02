# AGENTS.md — gh-metrics CLI

Instruções para agentes de IA (Copilot, Claude Code, Cursor etc.) neste repositório.

## Contexto

**gh-metrics** é uma CLI em TypeScript/Node.js que mostra métricas de repositórios e usuários do GitHub (commits, PRs, issues, linguagens, atividade).
É um projeto de portfólio **público**: qualidade, clareza e boas práticas importam mais que quantidade de features.

O autor é estudante de Ciência da Computação (iniciante). Então:
- Explique **por que** de cada decisão, em 1–3 frases. Não só entregue código.
- Prefira soluções simples e legíveis a soluções "espertas".
- Quando houver mais de uma abordagem razoável, mostre as opções e deixe o autor escolher.

## Idioma

- Código, nomes, commits, PRs, issues e README: **inglês** (recrutadores internacionais vão ler).
- Conversa com o autor: português do Brasil, tom casual e direto.

## Stack (não troque sem perguntar)

| Área | Escolha |
|---|---|
| Linguagem | TypeScript (`strict: true`) |
| Runtime | Node.js LTS (ESM) |
| CLI | `commander` |
| API do GitHub | `@octokit/rest` (ou `graphql`) |
| Validação | `zod` |
| Testes | `vitest` |
| Build | `tsup` |
| Lint/format | ESLint + Prettier |
| Output no terminal | `chalk` + `cli-table3` (ou similar) |
| CI | GitHub Actions |
| Release | `release-please` ou `changesets` |

**Regra:** nenhuma dependência nova sem justificar (para que serve, tamanho, alternativa nativa).

## Estrutura de pastas

```
src/
  cli/          # entrada e comandos (commander), sem lógica de negócio
  core/         # lógica pura de métricas (fácil de testar)
  github/       # cliente da API, paginação, rate limit, cache
  output/       # formatadores: table, json, markdown
  config/       # leitura de token/config
  utils/
tests/
  unit/
  integration/  # com API mockada
docs/
.github/workflows/
```

Princípio: **`cli` → `core` → `github`**. A lógica de métricas não conhece o terminal nem o HTTP.

## Workflow por tarefa

Siga SEMPRE esta ordem:

1. **Entender** — Reescreva a tarefa em 2–3 linhas e liste o que vai mudar. Se algo estiver ambíguo, pergunte antes de codar.
2. **Planejar** — Liste arquivos que serão criados/alterados e a ordem. Espere confirmação em tarefas grandes (mais de ~3 arquivos).
3. **Branch** — `feat/<nome>`, `fix/<nome>`, `docs/<nome>`, `chore/<nome>`.
4. **Testes primeiro (quando fizer sentido)** — Escreva o teste que falha, depois implemente.
5. **Implementar** — Mudanças pequenas e focadas. Uma responsabilidade por função.
6. **Verificar** — Rode e mostre o resultado de:
   ```bash
   npm run typecheck && npm run lint && npm test && npm run build
   ```
7. **Commit** — Conventional Commits, em inglês:
   `feat(core): add commit frequency metric`
   `fix(github): handle rate limit 403`
   Commits pequenos, um assunto por commit.
8. **Documentar** — Atualize README/docs se o comportamento visível mudou.
9. **Resumo** — Termine com: o que foi feito, decisões tomadas, o que ficou pendente.

## Regras de código

- Sem `any`. Use `unknown` + validação com `zod`.
- Funções puras no `core`; efeitos colaterais só nas bordas.
- Erros tratados com mensagens úteis para o usuário (nunca stack trace cru na CLI).
- Trate: token ausente/inválido, rate limit, repo inexistente, sem internet.
- Nunca logar ou commitar tokens. `.env` no `.gitignore`; mantenha `.env.example`.
- Todo comando tem `--help` claro e flag `--json` para saída programática.
- Comentários explicam o **porquê**, não o **o quê**.

## Definition of Done

Uma tarefa só está pronta quando:

- [ ] Typecheck, lint, testes e build passam
- [ ] Código novo tem testes (cobertura do `core` ≥ 80%)
- [ ] Sem `console.log` de debug, sem código morto
- [ ] README/docs atualizados se necessário
- [ ] Commit(s) seguem Conventional Commits
- [ ] Funciona rodando de verdade (`node dist/index.js ...`), não só nos testes

## Roadmap sugerido

**Fase 1 — Fundação**
- Setup: TS strict, ESLint, Prettier, Vitest, tsup, scripts npm
- CI no GitHub Actions (lint + test + build)
- `LICENSE` (MIT), `.gitignore`, `CONTRIBUTING.md` curto

**Fase 2 — MVP**
- `metrica auth` / leitura de `GITHUB_TOKEN`
- `metrica repo <owner/name>` → stars, forks, issues, PRs, linguagens
- Saída em tabela e `--json`

**Fase 3 — Métricas de verdade**
- `metrica activity <user>` → commits por período, dias ativos, streak
- `metrica prs <owner/name>` → tempo médio de merge, taxa de aprovação
- Cache local + tratamento de rate limit

**Fase 4 — Polimento (o que destaca no currículo)**
- README forte: GIF/demo do terminal, instalação, exemplos, badges (CI, versão, licença)
- Publicar no npm (`npx metrica`)
- Releases automáticas e CHANGELOG
- Issues/Milestones organizados no GitHub
- `docs/ARCHITECTURE.md` explicando decisões

## O que o agente NÃO deve fazer

- Reescrever grandes partes do projeto sem pedir.
- Adicionar features fora do escopo da tarefa.
- Pular testes "para ir mais rápido".
- Commitar direto na `main`.
- Gerar código que o autor não consiga explicar. Se o autor pedir, explique linha a linha.

## Modo aprendizado (ativar com "modo aprendizado")

Em vez de entregar tudo pronto:
1. Explique o conceito em poucas linhas.
2. Dê o esqueleto/assinatura da função.
3. Faça uma pergunta guiando o próximo passo.
4. Só revele a solução completa se o autor pedir.
