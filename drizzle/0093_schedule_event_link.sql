-- Escalas por equipe: vínculo opcional com um evento da mesma igreja.
-- Não altera escalas existentes nem cria registros; apenas adiciona o vínculo e o índice de consulta.
ALTER TABLE schedule_items
  ADD COLUMN eventId INT NULL AFTER departmentId,
  ADD INDEX schedule_items_church_event_idx (churchId, eventId);
