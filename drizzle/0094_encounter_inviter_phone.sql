-- Ficha pública do Encontro com Deus: telefone do líder que convidou.
-- Nullable para preservar fichas já recebidas antes desta melhoria.
ALTER TABLE encounter_disciple_forms
  ADD COLUMN invitedByPhone VARCHAR(20) NULL AFTER invitedByName;
