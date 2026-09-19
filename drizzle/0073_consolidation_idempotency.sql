-- Protege retries de encaminhamentos, acompanhamentos e visitas contra duplicação.
-- A aplicação customizada registra a migration uma única vez; nenhuma linha existente é reescrita.

ALTER TABLE consolidation_referrals
  ADD COLUMN idempotencyKey VARCHAR(64) NULL AFTER personId,
  ADD UNIQUE INDEX consolidation_referral_idempotency_unique (churchId, idempotencyKey);

ALTER TABLE consolidation_follow_ups
  ADD COLUMN idempotencyKey VARCHAR(64) NULL AFTER referralId,
  ADD UNIQUE INDEX consolidation_follow_up_idempotency_unique (churchId, referralId, idempotencyKey);

ALTER TABLE care_visits
  ADD COLUMN sourceFollowUpId INT NULL AFTER referralId,
  ADD UNIQUE INDEX care_visit_source_follow_up_unique (churchId, sourceFollowUpId);
