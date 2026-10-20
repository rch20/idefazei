# Publicação em produção pelo GitHub

Fluxo: GitHub Actions → usuário `ghdeploy` (sem senha, chave restrita) → `sudo` só para
`/usr/local/sbin/idefazei-github-production-deploy` → valida e reempacota o pacote sem
privilégios → chama `/usr/local/sbin/idefazei-production-deploy` (o mesmo programa de hoje).
O acesso do usuário `manus` não é alterado.

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
