-- Fase 2 da Escola de Fundamentos: reflexão e anotação individual por etapa.
-- Campos opcionais para preservar estudos antigos e a anotação geral histórica.
ALTER TABLE foundation_study_blocks
  ADD COLUMN IF NOT EXISTS reflectionPrompt TEXT NULL AFTER content;

ALTER TABLE foundation_block_progress
  ADD COLUMN IF NOT EXISTS reflection TEXT NULL AFTER completedAt;
