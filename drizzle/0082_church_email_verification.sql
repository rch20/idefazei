-- Confirmação de e-mail para contas criadas pelo cadastro público de discípulo.
-- Contas existentes permanecem liberadas: emailVerificationRequired começa false.

ALTER TABLE church_users
  ADD COLUMN emailVerificationRequired BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE church_users
  ADD COLUMN emailVerifiedAt TIMESTAMP NULL;

ALTER TABLE church_users
  ADD COLUMN emailVerificationSentAt TIMESTAMP NULL;

CREATE TABLE IF NOT EXISTS church_email_verification_tokens (
  id INT NOT NULL AUTO_INCREMENT,
  churchId INT NOT NULL,
  churchUserId INT NOT NULL,
  tokenHash VARCHAR(64) NOT NULL,
  expiresAt TIMESTAMP NOT NULL,
  usedAt TIMESTAMP NULL,
  requestIp VARCHAR(64) NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY church_email_verification_tokens_token_hash_unique (tokenHash),
  KEY church_email_verification_tokens_user_created_idx (churchUserId, createdAt),
  KEY church_email_verification_tokens_expires_idx (expiresAt)
) ENGINE=InnoDB;
