-- Contas a pagar como controle operacional; somente o pagamento confirmado gera uma saída em financial_transactions.
-- Esta migration é aditiva e não deve ser aplicada nesta etapa sem validação em homologação.

CREATE TABLE IF NOT EXISTS financial_payables (
  id INT NOT NULL AUTO_INCREMENT,
  churchId INT NOT NULL,
  description VARCHAR(255) NOT NULL,
  supplierName VARCHAR(255) NULL,
  amountCents INT NOT NULL,
  dueDate DATE NOT NULL,
  categoryId INT NULL,
  accountId INT NULL,
  paymentMethod ENUM('dinheiro', 'pix', 'transferencia', 'cartao', 'cheque', 'outro') NULL,
  paymentDate DATE NULL,
  status ENUM('aberta', 'paga', 'cancelada') NOT NULL DEFAULT 'aberta',
  financialTransactionId INT NULL,
  notes TEXT NULL,
  reference VARCHAR(160) NULL,
  paidByChurchUserId INT NULL,
  paidAt TIMESTAMP NULL,
  cancelledByChurchUserId INT NULL,
  cancelledAt TIMESTAMP NULL,
  cancellationReason TEXT NULL,
  createdByChurchUserId INT NOT NULL,
  updatedByChurchUserId INT NOT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY financial_payables_church_due_date_idx (churchId, dueDate),
  KEY financial_payables_church_status_due_date_idx (churchId, status, dueDate),
  UNIQUE KEY financial_payables_church_transaction_unique (churchId, financialTransactionId)
) ENGINE=InnoDB;

ALTER TABLE financial_audit_logs
  ADD COLUMN IF NOT EXISTS payableId INT NULL;

CREATE INDEX IF NOT EXISTS financial_audit_logs_payable_idx
  ON financial_audit_logs (churchId, payableId);

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
    'servico_cancelado',
    'pix_configurada',
    'pix_atualizada',
    'pix_ativada',
    'pix_desativada',
    'contribuicao_enviada',
    'contribuicao_atualizada',
    'contribuicao_aprovada',
    'contribuicao_recusada',
    'conta_pagar_criada',
    'conta_pagar_atualizada',
    'conta_pagar_cancelada',
    'conta_pagar_paga'
  ) NOT NULL;
