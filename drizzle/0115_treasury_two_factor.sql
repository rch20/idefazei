-- 2FA (TOTP) obrigatório para acesso à Tesouraria.
-- Migration aditiva: não cria lançamentos, não altera saldos e não migra dados existentes.
-- Guarda o segredo TOTP cifrado (mesmo padrão GCM das chaves Pagar.me, com namespace próprio)
-- e os códigos de recuperação em hash (uso único). Tudo escopado por churchId (multi-salão).
CREATE TABLE IF NOT EXISTS treasury_two_factor (
  id INT NOT NULL AUTO_INCREMENT,
  churchId INT NOT NULL,
  churchUserId INT NOT NULL,
  secretCipher VARCHAR(512) NOT NULL,
  enrolledAt TIMESTAMP NULL DEFAULT NULL,
  lastVerifiedAt TIMESTAMP NULL DEFAULT NULL,
  sessionVerifiedUntil TIMESTAMP NULL DEFAULT NULL,
  failedAttempts INT NOT NULL DEFAULT 0,
  lockedUntil TIMESTAMP NULL DEFAULT NULL,
  disabledAt TIMESTAMP NULL DEFAULT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY treasury_two_factor_church_user_unique (churchId, churchUserId)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS treasury_two_factor_recovery (
  id INT NOT NULL AUTO_INCREMENT,
  churchId INT NOT NULL,
  churchUserId INT NOT NULL,
  codeHash VARCHAR(128) NOT NULL,
  usedAt TIMESTAMP NULL DEFAULT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY treasury_two_factor_recovery_lookup_idx (churchId, churchUserId, codeHash),
  KEY treasury_two_factor_recovery_owner_idx (churchId, churchUserId)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS treasury_two_factor_audit (
  id INT NOT NULL AUTO_INCREMENT,
  churchId INT NOT NULL,
  churchUserId INT NOT NULL,
  actorChurchUserId INT NULL,
  action ENUM(
    'ativado',
    'verificado',
    'falha_verificacao',
    'recuperacao_usada',
    'codigos_regerados',
    'resetado',
    'desativado',
    'bloqueado'
  ) NOT NULL,
  detail VARCHAR(255) NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY treasury_two_factor_audit_owner_idx (churchId, churchUserId),
  KEY treasury_two_factor_audit_church_created_idx (churchId, createdAt)
) ENGINE=InnoDB;
