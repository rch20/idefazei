-- Permite preservar eventos de segurança por investigação formal, com escopo tenant-aware,
-- expiração obrigatória, revisão periódica e liberação explícita.
-- Esta migration é aditiva; não altera nem remove eventos existentes.

CREATE TABLE security_access_audit_holds (
  id INT NOT NULL AUTO_INCREMENT,
  churchId INT NOT NULL,
  eventType VARCHAR(100) NOT NULL DEFAULT 'security.tenant_access_denied',
  reason ENUM(
    'jwt_host_mismatch',
    'tenant_scope_mismatch',
    'tenant_unresolved',
    'client_tenant_mismatch'
  ) NULL,
  procedurePath VARCHAR(160) NULL,
  sessionChurchId INT NULL,
  targetChurchId INT NULL,
  sourceFingerprint VARCHAR(128) NULL,
  status ENUM('active', 'released', 'expired') NOT NULL DEFAULT 'active',
  holdReason VARCHAR(1000) NOT NULL,
  createdByChurchUserId INT NOT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  startsAt TIMESTAMP NOT NULL,
  expiresAt TIMESTAMP NOT NULL,
  reviewDueAt TIMESTAMP NOT NULL,
  lastReviewedByChurchUserId INT NULL,
  lastReviewedAt TIMESTAMP NULL,
  releasedByChurchUserId INT NULL,
  releasedAt TIMESTAMP NULL,
  releaseReason VARCHAR(500) NULL,
  expiredAt TIMESTAMP NULL,
  idempotencyKey VARCHAR(64) NULL,
  PRIMARY KEY (id),
  UNIQUE INDEX security_access_audit_holds_idempotency_unique (churchId, idempotencyKey),
  INDEX security_access_audit_holds_church_status_expiry_idx (churchId, status, expiresAt),
  INDEX security_access_audit_holds_event_reason_idx (eventType, reason),
  INDEX security_access_audit_holds_target_expiry_idx (targetChurchId, expiresAt),
  INDEX security_access_audit_holds_source_expiry_idx (sourceFingerprint, expiresAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
