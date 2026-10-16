-- Uniformiza referências e ações de auditoria para configurações estruturais da Tesouraria.
-- Somente novas ações serão gravadas; registros históricos não são reescritos.

ALTER TABLE financial_audit_logs
  ADD COLUMN accountId INT NULL,
  ADD COLUMN categoryId INT NULL,
  ADD COLUMN recurringScheduleId INT NULL,
  ADD COLUMN serviceId INT NULL;

ALTER TABLE financial_audit_logs
  ADD INDEX financial_audit_logs_account_idx (churchId, accountId),
  ADD INDEX financial_audit_logs_category_idx (churchId, categoryId),
  ADD INDEX financial_audit_logs_schedule_idx (churchId, recurringScheduleId),
  ADD INDEX financial_audit_logs_service_idx (churchId, serviceId);

ALTER TABLE financial_audit_logs
  MODIFY COLUMN action ENUM(
    'criado',
    'atualizado',
    'confirmado',
    'estornado',
    'periodo_fechado',
    'periodo_reaberto',
    'reconciliacao_criada',
    'reconciliacao_atualizada',
    'comprovante_adicionado',
    'comprovante_desvinculado',
    'conta_criada',
    'conta_atualizada',
    'categoria_criada',
    'categoria_atualizada',
    'categoria_ativada',
    'programacao_criada',
    'programacao_atualizada',
    'programacao_ativada',
    'servico_criado',
    'servico_atualizado',
    'servico_cancelado'
  ) NOT NULL;
