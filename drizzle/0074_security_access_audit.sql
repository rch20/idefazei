-- Persiste eventos mínimos de bloqueio tenant-aware para investigação de segurança.
-- Esta migration é aditiva; não reescreve registros existentes nem armazena tokens, cookies ou PII.

CREATE TABLE security_access_audit_logs (
  id INT NOT NULL AUTO_INCREMENT,
  churchId INT NOT NULL,
  eventType VARCHAR(100) NOT NULL,
  reason ENUM(
    'jwt_host_mismatch',
    'tenant_scope_mismatch',
    'tenant_unresolved',
    'client_tenant_mismatch'
  ) NOT NULL,
  procedurePath VARCHAR(160) NOT NULL,
  sessionChurchId INT NULL,
  targetChurchId INT NULL,
  actorChurchUserId INT NULL,
  requestId VARCHAR(120) NULL,
  sourceFingerprint VARCHAR(128) NULL,
  severity ENUM('warning', 'high', 'critical') NOT NULL DEFAULT 'warning',
  occurredAt TIMESTAMP NOT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX security_access_audit_logs_church_created_idx (churchId, createdAt),
  INDEX security_access_audit_logs_source_created_idx (sourceFingerprint, createdAt),
  INDEX security_access_audit_logs_target_created_idx (targetChurchId, createdAt),
  INDEX security_access_audit_logs_reason_created_idx (reason, createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
