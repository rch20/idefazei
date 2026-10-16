-- 0096: idempotência de criação de estudos e perguntas da Escola de Fundamentos.
-- Migration customizada ADITIVA. Número reservado apenas no checkout local;
-- conferir o ledger do ambiente antes de qualquer aplicação autorizada.
-- Não altera conteúdo, IDs, matrículas, respostas, progresso ou anotações.
-- NULL preserva os registros anteriores: MySQL permite múltiplos NULL no UNIQUE.
-- A definição ASCII binária mantém o UUID e hash com comparação determinística.
-- Aplicar seletivamente após preflight/backup; não executar por db:push.

ALTER TABLE `foundation_studies`
  ADD COLUMN `clientRequestId` VARCHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  ADD COLUMN `requestHash` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  ADD COLUMN `requestSchemaVersion` INT NULL,
  ADD UNIQUE INDEX `foundation_studies_church_author_request_unique`
    (`churchId`, `createdByChurchUserId`, `clientRequestId`);

ALTER TABLE `foundation_questions`
  ADD COLUMN `clientRequestId` VARCHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  ADD COLUMN `requestHash` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  ADD COLUMN `requestSchemaVersion` INT NULL,
  ADD UNIQUE INDEX `foundation_questions_church_author_request_unique`
    (`churchId`, `createdByChurchUserId`, `clientRequestId`);
