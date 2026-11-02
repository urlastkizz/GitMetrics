---
name: release-npm
description: Use SOMENTE quando o autor pedir explicitamente para publicar uma versão ou configurar releases - versionamento, CHANGELOG, tag, GitHub Release e publicação no npm.
---

# Release e publicação no npm

Ação de alto impacto: **nunca publique sem confirmação explícita do autor**.

1. Confirme a branch (`main` limpa e atualizada) e que o CI está verde.
2. Verifique `package.json`: `name` disponível no npm, `version`, `description`, `keywords`, `license`, `repository`, `bugs`, `homepage`, `bin`, `files` (só `dist`, `README.md`, `LICENSE`), `engines`.
3. Primeira linha de `dist/index.js` precisa do shebang `#!/usr/bin/env node`.
4. Teste local: `npm pack --dry-run` e `npm pack` + instalar o `.tgz` em uma pasta temporária e rodar `metrica --help`.
5. Versionamento semântico (SemVer). Prefira automatizar com `release-please` ou `changesets` via GitHub Actions.
6. Atualize `CHANGELOG.md` a partir dos Conventional Commits.
7. Publicação: use `npm publish --provenance --access public` pelo GitHub Actions com `NPM_TOKEN` em secrets. Nunca peça nem imprima o token.
8. Depois: crie tag e GitHub Release, adicione badges (npm, CI, licença) ao README.
