# Metadados obrigatórios de release

Toda release do Ide Fazei deve ser gerada a partir de um checkout Git limpo e carregar `release-source.json` na raiz do pacote.

## Preparação do pacote

A partir da raiz do checkout que realmente gerou o build:

```bash
pnpm release:stamp -- \
  --root "$PWD" \
  --output /caminho/da/staging/release-source.json
```

O comando falha se o checkout não for Git, estiver em `HEAD` destacado ou possuir arquivos modificados/não rastreados. O arquivo não contém segredos; registra somente:

- `branch`;
- `commitSha`;
- estado limpo do worktree;
- instante da geração.

A embalagem deve incluir exatamente `./release-source.json`. O auditor e os wrappers rejeitam pacotes sem esse arquivo.

Para usar o fluxo oficial depois de gerar o build:

```bash
pnpm release:package /caminho/da/árvore-do-pacote /caminho/da/release.tar.gz "$PWD"
```

Esse comando copia a árvore para uma área temporária, gera `release-source.json`, valida os arquivos obrigatórios, audita o tarball e calcula o SHA-256. O manifesto final é escrito pelo wrapper no servidor porque o hash só existe depois que o tarball está fechado.

## Geração do manifesto final

Depois que o pacote for calculado, o wrapper oficial calcula o SHA-256 do tarball e gera, dentro da release extraída:

```text
release-manifest.json
```

O manifesto contém `releaseId`, `target`, `branch`, `commitSha`, `packageSha256`, nome do pacote e timestamps. O hash é calculado sobre o tarball recebido, antes da extração; isso evita circularidade.

## Regras

- Não incluir `.env`, cookies, tokens, bancos, uploads, logs ou chaves no pacote.
- Não editar o manifesto manualmente depois do cálculo do SHA.
- Releases antigas continuam legíveis, mas podem não conter os campos de rastreabilidade; a partir da próxima release esses campos são obrigatórios.
- O manifesto é evidência operacional, não substitui o backup nem os health checks.
