-- Etapa 3B/3C: histórico, assinatura opcional e lançamento protegido da ficha.
-- Não cria lançamentos existentes; apenas prepara os estados e o vínculo idempotente.
ALTER TABLE treasury_entry_sheets
  ADD COLUMN postingStatus ENUM('nao_lancada', 'lancada') NOT NULL DEFAULT 'nao_lancada' AFTER status,
  ADD COLUMN finalizedAt TIMESTAMP NULL AFTER updatedByChurchUserId,
  ADD COLUMN finalizedByChurchUserId INT NULL AFTER finalizedAt,
  ADD COLUMN signedAt TIMESTAMP NULL AFTER finalizedByChurchUserId,
  ADD COLUMN signedByChurchUserId INT NULL AFTER signedAt,
  ADD COLUMN postedAt TIMESTAMP NULL AFTER signedByChurchUserId,
  ADD COLUMN postedByChurchUserId INT NULL AFTER postedAt;

ALTER TABLE treasury_entry_sheet_lines
  ADD COLUMN financialTransactionId INT NULL AFTER description,
  ADD UNIQUE KEY treasury_entry_sheet_lines_church_transaction_unique (churchId, financialTransactionId);
