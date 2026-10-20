# Publicação em produção pelo GitHub

Fluxo: GitHub Actions → usuário `ghdeploy` (sem senha, chave restrita) → `sudo` só para
`/usr/local/sbin/idefazei-github-production-deploy` → valida e reempacota o pacote sem
privilégios → chama `/usr/local/sbin/idefazei-production-deploy` (o mesmo programa de hoje).
O acesso do usuário `manus` não é alterado.

## Gatilho automático

Cada push na branch de produção roda: validar → travas → preflight → apply → conferência pública (volta sozinho se
falhar). Se `client/` não mudou desde a versão ativa, o workflow termina sem publicar. Se mudou servidor, banco ou
dependências, ele falha de propósito e avisa (ver abaixo). Manual: Actions → Run workflow (preflight, apply ou rollback).

## O que continua protegido (não remover sem decisão explícita)

| Trava (no deploy de produção) | Efeito na publicação pelo GitHub |
|---|---|
| `validate_runtime_compatibility` (hash de `dist/index.js`) | Só passa se o servidor for idêntico ao ativo ou estiver na lista aprovada. Mudança só visual passa; mudança de servidor para no preflight. |
| `MIGRATION_IN_FRONTEND_PACKAGE` | O pacote nunca leva `drizzle/` ou SQL. O workflow também bloqueia se `drizzle/` mudou. |
| Rotas do front (`frontendRouteChanges`) | Se telas forem criadas/removidas, o preflight mostra a lista e o workflow é rodado de novo com ela declarada. |
| Contrato do systemd, saúde, logs | Inalterados. |
| Rollback automático | Inalterado; o workflow ainda confere o site e volta sozinho se falhar. |

## Escopo do fluxo automático

Publica **somente mudanças de interface** (`client/`). O workflow bloqueia se mudaram `server/`, `shared/`,
`package.json`, `pnpm-lock.yaml`, `patches/` ou `drizzle/` desde a versão ativa. O `dist/index.js` gerado precisa ter o
mesmo hash do ativo (o build do servidor é reprodutível: verificado, `c2f333b8…`). O `foundation-import-runtime.mjs`
**não** é reprodutível no GitHub (hash diferente do da VPS), então o pacote leva o arquivo ativo da produção
(modo `baseline` do intermediário), permitido porque nada do servidor mudou.

## Mudança de servidor (API) — fluxo deliberado

1. O preflight para com `SERVER_RUNTIME_DRIFT`.
2. Revisar o código; no deploy de produção, adicionar **um** caso novo em `validate_runtime_compatibility`
   com o hash novo e marcadores de código esperados (não trocar a lógica existente).
3. Rodar o workflow de novo.

## Mudança de banco — backup específico e recuperação

O workflow **bloqueia** quando `drizzle/` mudou. Ordem recomendada para esse caso:

1. Backup do banco (só do banco `idefazei`, não da VPS):
   `ssh ghdeploy@HOST sudo -n /usr/local/sbin/idefazei-github-production-deploy db-backup antes-<descricao>`
   Gera `/var/backups/idefazei/db/db-idefazei-<descricao>-<data>.sql.gz` (+ `.sha256`), modo 600.
2. Aplicar a migration pelo fluxo operacional existente (`ops/apply-custom-migrations.mjs`, ledger
   `drizzle/custom-migrations.json`) — ainda não automatizado neste workflow.
3. Publicar o código.

Recuperação do banco (manual, no terminal da VPS como root; desfaz também gravações feitas depois do backup):

```bash
sha256sum -c /var/backups/idefazei/db/ARQUIVO.sql.gz.sha256
systemctl stop idefazei
gunzip -c /var/backups/idefazei/db/ARQUIVO.sql.gz | mysql
systemctl start idefazei
```

Depois, voltar o código com a ação **rollback** do workflow, se a migration não for compatível com o código anterior.

## Configuração única

Ver as etapas passo a passo na conversa; resumo:

- VPS: pasta `/var/lib/idefazei-incoming/production` (dono `ghdeploy`, 750), instalar o intermediário
  (`ops/vps/idefazei-github-production-deploy`, root:root 750) e liberar `sudo` do `ghdeploy` só para ele.
- GitHub → Settings → Environments → `production`: secrets `GHDEPLOY_SSH_PRIVATE_KEY`, `GHDEPLOY_KNOWN_HOSTS`;
  variável `DEPLOY_SSH_HOST`. Ativar "Required reviewers" se quiser aprovação manual.

## Procedimento proposto: mudanças de servidor e de banco (ainda não ativo)

Princípio: nenhuma trava é removida. Cada trava ganha um caminho de **aprovação registrada**, em vez de ser contornada.

### Servidor sem banco
1. PR com testes (`pnpm check`, `vitest`, build) verdes.
2. O preflight pára com `SERVER_RUNTIME_DRIFT` e mostra o hash novo.
3. Aprovação: um arquivo em `/etc/ide-fazei/approved-runtimes.d/<release>.conf` (root) com hash novo, hash base (o ativo),
   commit e marcadores de código esperados. Requer **uma** alteração única em `validate_runtime_compatibility` para ler esses
   arquivos (mesma lógica dos casos `FOUNDATION_*` atuais: base == ativo, pacote aprovado, commit conferido).
4. Publicação com a mesma cadeia (preflight → apply → conferência → rollback automático).

### Banco
Regra de projeto: migrations **aditivas e retrocompatíveis** (criar coluna/tabela/índice; nunca remover/renomear na mesma versão),
para que voltar o código não exija restaurar o banco.
1. Migration em `drizzle/NNNN_*.sql` + entrada no ledger `drizzle/custom-migrations.json` (com sha256), testada nos scripts `scripts/test-*-mysql8.py`.
2. `db-backup antes-<descricao>` (dump só do banco `idefazei`, `/var/backups/idefazei/db`, verificado por `gzip -t` e sha256).
3. Aplicar com `ops/apply-custom-migrations.mjs` (`CUSTOM_MIGRATION_IDS`), conferindo o ledger (`idefazei_custom_migrations`) e o esquema.
4. Publicar o servidor aprovado (item anterior).
5. Falha: voltar o código (`rollback`); restaurar o banco só se a migration não for retrocompatível (comando no tópico de recuperação acima).

### Decisões pendentes (suas)
- Aprovar hash de servidor automaticamente pelo workflow (com backup e testes) ou manter a aprovação como ato seu na VPS?
  Automático = o controle passa a ser o acesso ao GitHub (proteja a branch e a conta com 2FA).
- Permitir migrations apenas aditivas automaticamente, e exigir sua aprovação para qualquer coisa destrutiva?
