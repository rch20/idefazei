-- Configuração PIX por tenant e fila de contribuições online.
-- A aprovação cria o lançamento financeiro; esta migration não reescreve dados existentes.

CREATE TABLE IF NOT EXISTS treasury_pix_settings (
  id INT NOT NULL AUTO_INCREMENT,
  churchId INT NOT NULL,
  pixKeyType ENUM('cpf', 'cnpj', 'email', 'telefone', 'aleatoria', 'outro') NOT NULL,
  pixKey VARCHAR(255) NOT NULL,
  recipientName VARCHAR(255) NOT NULL,
  institutionName VARCHAR(160) NULL,
  qrCodeFileKey VARCHAR(512) NULL,
  qrCodeUrl VARCHAR(1024) NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  version INT NOT NULL DEFAULT 1,
  createdByChurchUserId INT NOT NULL,
  updatedByChurchUserId INT NOT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY treasury_pix_settings_church_unique (churchId),
  KEY treasury_pix_settings_church_active_idx (churchId, active)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS online_contributions (
  id INT NOT NULL AUTO_INCREMENT,
  churchId INT NOT NULL,
  personId INT NOT NULL,
  submittedByChurchUserId INT NOT NULL,
  pixSettingsId INT NOT NULL,
  type ENUM('dizimo', 'oferta', 'primicias') NOT NULL,
  paymentMethod ENUM('pix') NOT NULL DEFAULT 'pix',
  informedAmountCents INT NOT NULL,
  confirmedAmountCents INT NULL,
  paymentDate DATE NULL,
  status ENUM('pendente', 'aprovada', 'recusada') NOT NULL DEFAULT 'pendente',
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
  submittedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY online_contributions_church_submitter_idempotency_unique (churchId, submittedByChurchUserId, idempotencyKey),
  UNIQUE KEY online_contributions_church_transaction_unique (churchId, financialTransactionId),
  KEY online_contributions_church_status_submitted_idx (churchId, status, submittedAt),
  KEY online_contributions_church_person_submitted_idx (churchId, personId, submittedAt),
  KEY online_contributions_church_proof_sha256_idx (churchId, proofSha256)
) ENGINE=InnoDB;

ALTER TABLE financial_audit_logs
  ADD COLUMN pixSettingsId INT NULL,
  ADD COLUMN onlineContributionId INT NULL;

ALTER TABLE financial_audit_logs
  ADD INDEX financial_audit_logs_pix_settings_idx (churchId, pixSettingsId),
  ADD INDEX financial_audit_logs_online_contribution_idx (churchId, onlineContributionId);

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
    'contribuicao_recusada'
  ) NOT NULL;
