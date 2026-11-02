---
name: github-api-client
description: Use ao criar ou alterar chamadas à API do GitHub - Octokit, paginação, rate limit, autenticação por token, cache e tratamento de erros HTTP.
---

# Cliente da API do GitHub

Tudo que fala com a API fica em `src/github/`. O resto do projeto nunca importa `@octokit` diretamente.

1. Crie um único cliente em `src/github/client.ts` com token vindo de `src/config` (`--token` > `GITHUB_TOKEN`). O token nunca é logado.
2. Cada busca é uma função pequena e tipada (`fetchRepo`, `fetchCommits`, `fetchPullRequests`) que devolve tipos **do projeto**, não os tipos crus do Octokit. Valide a resposta com `zod` quando o formato importar.
3. Use `octokit.paginate` / `paginate.iterator` para listas; permita limite (`--limit`) para não baixar tudo sem necessidade.
4. Rate limit: leia `x-ratelimit-remaining` e `x-ratelimit-reset`. Se 403/429, mostre quando o limite reseta e saia com erro amigável.
5. Mapeie erros: 401 → token inválido; 404 → repo/usuário não encontrado (ou sem acesso); rede → "sem conexão".
6. Cache opcional em `~/.cache/gitmetrics/` com TTL curto (ex. 5 min) e flag `--no-cache`. Só implemente se pedido.
7. Testes: mock do cliente (injeção de dependência ou `vi.mock`). **Nunca** chame a API real em testes.

Commit sugerido: `feat(github): add <busca> fetcher`.
