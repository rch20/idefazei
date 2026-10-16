# Migration 0085 — homologação, EXPLAIN e rollback

**Escopo:** índice composto tenant-aware para os filtros de competência de `financial_transactions`.

**Commit local de referência:** `6109813` (`perf: otimizar filtros de data da tesouraria`)

**Migration:** `drizzle/0085_financial_transaction_date_index.sql`

**SHA-256 da migration:** `0f5c7b71cc8cab0b0d233145c68f5e156d75216d5204f4328d55b89756fbf540`

**Índice:** `financial_transactions_church_date_idx (churchId, transactionDate)`

## Estado atual

A alteração está implementada localmente e registrada no `drizzle/custom-migrations.json`. A migration **não foi aplicada** em homologação nem em produção, e nenhum dado real foi alterado.

A execução real de homologação está bloqueada por uma condição objetiva: não há, nesta sessão, um host SSH de homologação validado nem evidência de um banco separado. Os aliases públicos `staging`, `homolog`, `qa`, `preview` e `dev` respondem por HTTPS, mas a auditoria anterior comprovou que eles podem ser aliases do mesmo serviço e não demonstram isolamento de processo, banco, storage ou secrets.

Também não se deve usar o wrapper de produção atual para esta migration: ele está allowlisted para o pacote histórico da migration 0071 e não aceita o artefato 0085. Usá-lo com nomes falsos seria inseguro e não aplicaria o índice correto.

Há ainda uma pendência de baseline: `drizzle/custom-migrations.json` registra `0083`, `0084` e agora `0085`, mas não registra `0082`. Antes de preparar um banco novo ou afirmar que a sequência customizada está completa, confirmar separadamente o checksum e a aplicação de `0082`. Esta etapa não deve aplicar ou reconstituir `0082` por conta própria.

## O que deve ser confirmado antes da execução

No computador/servidor de homologação, sem imprimir `.env`, `DATABASE_URL`, tokens ou PII:

```bash
hostname
whoami
pwd
find /home /opt /srv -name AGENTS.md -print 2>/dev/null
sudo -n -l
sudo ufw status verbose
```

Critérios de parada:

- o hostname não pode ser o servidor de produção;
- o banco precisa ser separado e identificado apenas pelo nome sanitizado, por exemplo `idefazei_homolog`;
- o processo precisa usar um runtime/secrets próprios da homologação;
- o usuário operacional precisa ter uma forma autorizada de aplicar a migration, sem editar a aplicação ativa manualmente;
- o checkout deve estar no commit exato que contém o schema e a migration 0085;
- a aplicação e o banco devem ser comprovados antes do EXPLAIN.

## Preflight da migration

Depois de existir um host de homologação comprovado, transferir somente os arquivos necessários por canal SSH protegido. O pacote não pode conter `.env`, dumps, uploads, logs ou chaves privadas.

No host de homologação, carregar o runtime protegido pelo mecanismo local, sem exibir o valor:

```bash
set -Eeuo pipefail
cd /opt/idefazei-homolog/current
set +u
. /etc/idefazei/homolog.env
set -u

node -e 'require.resolve("mysql2")'
sha256sum drizzle/0085_financial_transaction_date_index.sql
```

O checksum deve ser exatamente:

```text
0f5c7b71cc8cab0b0d233145c68f5e156d75216d5204f4328d55b89756fbf540
```

Antes de executar o SQL, verificar se o índice já existe e se possui as colunas corretas. A consulta de verificação não expõe dados de negócio:

```sql
SELECT TABLE_SCHEMA, TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX, COLUMN_NAME
FROM information_schema.statistics
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'financial_transactions'
  AND INDEX_NAME = 'financial_transactions_church_date_idx'
ORDER BY SEQ_IN_INDEX;
```

Resultado esperado antes da primeira aplicação: nenhuma linha. Se o índice já existir, não executar `CREATE INDEX`; validar as colunas e registrar a migration como já aplicada naquela base.

## Aplicação idempotente em homologação

A migration SQL é deliberadamente simples, mas `CREATE INDEX` isolado não deve ser reexecutado cegamente. A aplicação operacional deve fazer a verificação anterior e só executar o DDL quando não houver o índice:

```bash
set -Eeuo pipefail
cd /opt/idefazei-homolog/current
set +u
. /etc/idefazei/homolog.env
set -u

node --input-type=commonjs <<'NODE'
const mysql = require('mysql2/promise');
const fs = require('node:fs');
const crypto = require('node:crypto');

const migrationPath = 'drizzle/0085_financial_transaction_date_index.sql';
const expectedSha256 = '0f5c7b71cc8cab0b0d233145c68f5e156d75216d5204f4328d55b89756fbf540';
const actualSha256 = crypto.createHash('sha256').update(fs.readFileSync(migrationPath)).digest('hex');
if (actualSha256 !== expectedSha256) throw new Error('CHECKSUM_0085_MISMATCH');
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL_MISSING_FROM_PROTECTED_RUNTIME');

(async () => {
  const connection = await mysql.createConnection({ uri: process.env.DATABASE_URL, multipleStatements: false });
  try {
    const [rows] = await connection.query(
      `SELECT INDEX_NAME, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS columns_list
       FROM information_schema.statistics
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'financial_transactions'
         AND INDEX_NAME = 'financial_transactions_church_date_idx'
       GROUP BY INDEX_NAME`
    );
    const existing = rows[0];
    if (existing) {
      if (existing.columns_list !== 'churchId,transactionDate') throw new Error('INDEX_0085_EXISTS_WITH_UNEXPECTED_COLUMNS');
      console.log('MIGRATION_0085_ALREADY_APPLIED');
      return;
    }
    await connection.query('CREATE INDEX `financial_transactions_church_date_idx` ON `financial_transactions` (`churchId`, `transactionDate`)');
    console.log('MIGRATION_0085_APPLIED');
  } finally {
    await connection.end();
  }
})().catch((error) => {
  console.error(error instanceof Error ? error.message : 'MIGRATION_0085_FAILED');
  process.exitCode = 1;
});
NODE
```

O script deve ser um artefato operacional revisado e allowlisted do ambiente de homologação. Não executar este bloco na produção sem um wrapper de produção explicitamente atualizado para aceitar a migration 0085.

## EXPLAIN antes e depois

Usar um `churchId` e uma `accountId` de fixture sintética da homologação. Não copiar IDs ou dados da produção para o relatório. Executar o mesmo plano antes da aplicação e depois da aplicação.

### Consulta principal do livro-caixa

```sql
EXPLAIN
SELECT
  ft.id,
  ft.churchId,
  ft.accountId,
  ft.categoryId,
  ft.type,
  ft.amountCents,
  ft.transactionDate,
  ft.status,
  ft.createdAt
FROM financial_transactions AS ft
INNER JOIN financial_accounts AS fa
  ON fa.id = ft.accountId
 AND fa.churchId = :churchId
INNER JOIN financial_categories AS fc
  ON fc.id = ft.categoryId
 AND fc.churchId = :churchId
WHERE ft.churchId = :churchId
  AND ft.transactionDate >= :startDate
  AND ft.transactionDate <= :endDate
  AND ft.accountId = :accountId
  AND ft.status <> 'rascunho'
ORDER BY ft.transactionDate DESC, ft.createdAt DESC;
```

Para clientes que não aceitam parâmetros nomeados no `EXPLAIN`, substituir apenas por valores sintéticos da homologação. Não usar concatenação de entrada externa.

### Consulta do subtotal de contribuições online

```sql
EXPLAIN
SELECT
  COALESCE(SUM(ft.amountCents), 0) AS approvedOnlineContributionsCents,
  COUNT(*) AS approvedOnlineContributionsCount
FROM online_contributions AS oc
INNER JOIN financial_transactions AS ft
  ON ft.id = oc.financialTransactionId
 AND ft.churchId = :churchId
WHERE oc.churchId = :churchId
  AND oc.status = 'aprovada'
  AND ft.status = 'confirmado'
  AND ft.type = 'entrada'
  AND ft.transactionDate >= :startDate
  AND ft.transactionDate <= :endDate
  AND ft.accountId = :accountId;
```

Registrar, antes e depois:

- `type`, `possible_keys`, `key`, `key_len`, `rows` e `Extra`;
- tempo medido em uma execução controlada, se disponível;
- quantidade aproximada de linhas da tabela, sem exportar dados;
- confirmação de que `ft.churchId = :churchId` permanece no plano;
- confirmação de que a soma contábil não foi alterada.

O índice 0085 foi desenhado para reduzir a busca por tenant e competência. Ele não garante sozinho o melhor plano para o filtro opcional por conta: se o EXPLAIN real mostrar varredura excessiva nas consultas por conta, avaliar separadamente `(churchId, accountId, transactionDate)` em uma migration futura. Não criar esse segundo índice antecipadamente.

## Validação depois da migration

Somente leituras:

```sql
SHOW INDEX FROM financial_transactions
  WHERE Key_name = 'financial_transactions_church_date_idx';

SELECT COUNT(*) AS confirmed_entries
FROM financial_transactions
WHERE churchId = :churchId
  AND transactionDate >= :startDate
  AND transactionDate <= :endDate
  AND status = 'confirmado'
  AND type = 'entrada';
```

Depois, validar a aplicação de homologação:

```bash
sudo systemctl is-active idefazei-homolog
ss -ltn | grep ':3100'
sudo nginx -t
curl -fsSI https://homolog.idefazei.com.br/
```

A validação deve confirmar que o processo e a porta de homologação são diferentes dos de produção. Não fazer mutation financeira nem criar contribuição real; a migration é somente DDL e o EXPLAIN deve usar dados sintéticos.

## Comando de deploy controlado — somente após o preflight

O comando operacional deve ser montado com variáveis locais, sem colocar secrets na linha de comando:

```bash
set -Eeuo pipefail
KEY=/home/ubuntu/.ssh/<chave-privada-validada>
STAGE_HOST=<host-ssh-de-homologacao-validado>
STAGE_USER=<usuario-operacional-de-homologacao>
REMOTE_DIR=/home/<usuario-operacional-de-homologacao>/idefazei-release-0085-6109813

ssh_opts=(-o BatchMode=yes -o IdentitiesOnly=yes -o ConnectTimeout=15 -o StrictHostKeyChecking=yes -i "$KEY")
ssh "${ssh_opts[@]}" "$STAGE_USER@$STAGE_HOST" 'hostname; whoami; sudo -n -l'
ssh "${ssh_opts[@]}" "$STAGE_USER@$STAGE_HOST" "mkdir -p '$REMOTE_DIR' && chmod 700 '$REMOTE_DIR'"
scp "${ssh_opts[@]}" \
  drizzle/0085_financial_transaction_date_index.sql \
  drizzle/custom-migrations.json \
  "$STAGE_USER@$STAGE_HOST:$REMOTE_DIR/"
ssh "${ssh_opts[@]}" "$STAGE_USER@$STAGE_HOST" \
  "cd '$REMOTE_DIR' && sha256sum -c <(printf '%s  %s\\n' '0f5c7b71cc8cab0b0d233145c68f5e156d75216d5204f4328d55b89756fbf540' drizzle/0085_financial_transaction_date_index.sql)"
```

A aplicação efetiva depende de um comando allowlisted equivalente a `stage`, `preflight` e `apply-migration` no host de homologação. O wrapper de produção conhecido **não deve** ser chamado para esse pacote enquanto não aceitar 0085 de forma explícita.

## Rollback

Esta migration não altera linhas, valores, contas, contribuições, uploads ou tenants. O rollback do banco é somente a remoção do índice criado por esta execução, e só deve ocorrer se houver motivo concreto e se o índice não existia antes:

```sql
ALTER TABLE financial_transactions
  DROP INDEX financial_transactions_church_date_idx;
```

Antes do `DROP`, confirmar novamente:

1. o nome exato do índice;
2. que suas colunas são `churchId, transactionDate`;
3. que ele foi criado pela execução 0085 e não era preexistente;
4. que não há outra release dependendo dele.

Se o problema for no código da aplicação, fazer rollback do artefato da aplicação usando o backup da mesma execução e reiniciar somente pelo serviço de homologação. Não remover o banco, não restaurar dump, não apagar uploads e não usar rollback de aplicação para desfazer dados.

Após qualquer rollback, repetir `SHOW INDEX`, EXPLAIN, health local, Nginx e HTTPS. Preservar o backup e o log sanitizado.

## Análise de outros candidatos a índices

| Tabela                      | Consultas observadas                                                                   | Estado                                                                                         | Prioridade                            |
| --------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------- |
| `financial_transactions`    | tenant + intervalo de `transactionDate`, com joins e status                            | 0085 cobre `(churchId, transactionDate)`                                                       | Alta — medir agora                    |
| `online_contributions`      | fila por tenant/status/data, pessoa/data e vínculo financeiro                          | Já possui índices compostos adequados no schema                                                | Não criar agora                       |
| `consolidation_referrals`   | fila, responsável, departamento e pessoa por tenant/status                             | Já possui quatro índices compostos tenant-aware                                                | Não criar agora                       |
| `foundation_*`              | progresso por matrícula/estudo, conteúdo por estudo/posição, aulas por estudo/data     | Índices compostos já declarados                                                                | Não criar agora                       |
| `primary_discipler_events`  | histórico por pessoa e ator, ordenado por criação                                      | Já possui `(churchId, personId, createdAt)` e `(churchId, actor, createdAt)`                   | Não criar agora                       |
| `financial_reconciliations` | busca por conta e período                                                              | Unique `(churchId, accountId, periodStart)` já cobre a chave de negócio                        | Não criar agora                       |
| `financial_period_closures` | tenant + período e limites de início/fim                                               | Unique `(churchId, periodStart)` existe; volume mensal tende a ser pequeno                     | Baixa — medir antes                   |
| `care_assignments`          | leituras por tenant/pessoa/ativo/papel e por responsável                               | Não há índice composto equivalente visível no schema                                           | Média — EXPLAIN antes de propor       |
| `cell_members`              | busca por pessoa/ativo e por célula/ativo, com join em `cells`                         | Não há índice composto declarado na tabela                                                     | Média — avaliar com cardinalidade     |
| `notification_deliveries`   | destinatário/status/canal e ordenação temporal                                         | Já possui `(churchId, recipientChurchUserId, status)`; falta provar gargalo de ordenação/canal | Média — somente com EXPLAIN           |
| `financial_audit_logs`      | auditoria por recurso; não foi encontrada leitura cronológica principal no fluxo atual | Índices por recurso já existentes                                                              | Baixa — não adicionar por antecipação |

Para `care_assignments`, `cell_members`, `notification_deliveries` e `financial_audit_logs`, a próxima etapa correta é capturar as queries reais, cardinalidade por tenant e `EXPLAIN` em homologação. Não criar uma migration genérica apenas porque a tabela parece sem índice.

## Critério de conclusão

A etapa só poderá ser marcada como concluída quando houver:

- host e banco de homologação comprovadamente separados;
- checksum 0085 verificado;
- migration aplicada de forma idempotente ou reconhecida como já aplicada;
- `SHOW INDEX` confirmando as duas colunas na ordem correta;
- EXPLAIN antes/depois registrado;
- testes locais, `pnpm check`, build e suíte direcionada aprovados;
- health da homologação aprovado;
- rollback testado conceitualmente e backup preservado;
- nenhum comando de produção executado sem autorização específica.
