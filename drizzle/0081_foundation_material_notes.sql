-- Preserva a observação editorial de cada material vinculado ao estudo.
-- Não altera registros existentes; materiais antigos permanecem com notes NULL.

ALTER TABLE foundation_study_materials
  ADD COLUMN IF NOT EXISTS notes TEXT NULL;
