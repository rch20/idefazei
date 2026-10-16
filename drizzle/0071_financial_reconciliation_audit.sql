ALTER TABLE `financial_audit_logs`
  ADD COLUMN `reconciliationId` int NULL AFTER `transactionId`,
  ADD COLUMN `attachmentId` int NULL AFTER `reconciliationId`,
  MODIFY COLUMN `action` enum('criado','atualizado','confirmado','estornado','periodo_fechado','periodo_reaberto','reconciliacao_criada','reconciliacao_atualizada','comprovante_adicionado','comprovante_desvinculado') NOT NULL;

ALTER TABLE `financial_audit_logs`
  ADD KEY `financial_audit_logs_church_reconciliation_idx` (`churchId`,`reconciliationId`,`createdAt`),
  ADD KEY `financial_audit_logs_church_attachment_idx` (`churchId`,`attachmentId`,`createdAt`);
