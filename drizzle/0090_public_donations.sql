-- Doação pública por tenant: opt-in explícito, comprovante privado e aprovação contábil posterior.
-- Esta migration não cria lançamentos nem reprocessa contribuições existentes.
ALTER TABLE treasury_pix_settings
  ADD COLUMN IF NOT EXISTS publicDonationEnabled BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS public_donation_submissions (
  id INT NOT NULL AUTO_INCREMENT,
  churchId INT NOT NULL,
  pixSettingsId INT NOT NULL,
  donorName VARCHAR(255) NOT NULL,
  donorPhone VARCHAR(20) NULL,
  donorEmail VARCHAR(320) NULL,
  type ENUM('doacao', 'dizimo', 'oferta', 'primicias') NOT NULL,
  paymentMethod ENUM('pix') NOT NULL DEFAULT 'pix',
  informedAmountCents INT NOT NULL,
  confirmedAmountCents INT NULL,
  paymentDate DATE NULL,
  prayerRequest TEXT NULL,
  proofFileKey VARCHAR(512) NOT NULL,
  proofUrl VARCHAR(1024) NOT NULL,
  proofFileName VARCHAR(255) NOT NULL,
  proofMimeType VARCHAR(100) NOT NULL,
  proofSizeBytes INT NOT NULL,
  proofSha256 VARCHAR(64) NOT NULL,
  pixKeySnapshot VARCHAR(255) NOT NULL,
  pixKeyTypeSnapshot ENUM('cpf', 'cnpj', 'email', 'telefone', 'aleatoria', 'outro') NOT NULL,
  pixRecipientNameSnapshot VARCHAR(255) NOT NULL,
  pixInstitutionNameSnapshot VARCHAR(160) NULL,
  rejectionReason TEXT NULL,
  reviewNotes TEXT NULL,
  reviewedByChurchUserId INT NULL,
  reviewedAt TIMESTAMP NULL,
  financialTransactionId INT NULL,
  idempotencyKey VARCHAR(64) NOT NULL,
  privacyConsentAt TIMESTAMP NOT NULL,
  status ENUM('pendente', 'aprovada', 'recusada') NOT NULL DEFAULT 'pendente',
  submittedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY public_donation_church_idempotency_unique (churchId, idempotencyKey),
  UNIQUE KEY public_donation_church_transaction_unique (churchId, financialTransactionId),
  UNIQUE KEY public_donation_church_proof_key_unique (churchId, proofFileKey),
  KEY public_donation_church_status_submitted_idx (churchId, status, submittedAt),
  KEY public_donation_church_proof_sha256_idx (churchId, proofSha256)
) ENGINE=InnoDB;

ALTER TABLE financial_audit_logs
  ADD COLUMN IF NOT EXISTS publicDonationId INT NULL;

CREATE INDEX IF NOT EXISTS financial_audit_logs_public_donation_idx
  ON financial_audit_logs (churchId, publicDonationId);

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
    'doacao_publica_ativada',
    'doacao_publica_desativada',
    'doacao_publica_aprovada',
    'doacao_publica_recusada',
    'conta_pagar_criada',
    'conta_pagar_atualizada',
    'conta_pagar_cancelada',
    'conta_pagar_paga'
  ) NOT NULL;
