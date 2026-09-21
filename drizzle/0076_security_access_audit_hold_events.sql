-- Mantém trilha append-only de abertura, revisão, liberação e expiração de security holds.
-- Esta migration é aditiva; não altera nem remove holds ou eventos existentes.

CREATE TABLE security_access_audit_hold_events (
  id INT NOT NULL AUTO_INCREMENT,
  churchId INT NOT NULL,
  holdId INT NOT NULL,
  action ENUM('opened', 'reviewed', 'released', 'expired') NOT NULL,
  actorChurchUserId INT NULL,
  previousStatus ENUM('active', 'released', 'expired') NULL,
  newStatus ENUM('active', 'released', 'expired') NULL,
  previousExpiresAt TIMESTAMP NULL,
  newExpiresAt TIMESTAMP NULL,
  previousReviewDueAt TIMESTAMP NULL,
  newReviewDueAt TIMESTAMP NULL,
  reason VARCHAR(1000) NOT NULL,
  metadata JSON NULL,
  occurredAt TIMESTAMP NOT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX security_access_audit_hold_events_church_occurred_idx (churchId, occurredAt),
  INDEX security_access_audit_hold_events_hold_occurred_idx (holdId, occurredAt),
  INDEX security_access_audit_hold_events_action_occurred_idx (churchId, action, occurredAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
