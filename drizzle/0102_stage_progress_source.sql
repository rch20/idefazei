-- Prontuário: origem de cada etapa da formação (manual, automático por curso/batismo/encontro, ou veio de outra igreja).
ALTER TABLE `discipleship_stage_progress` ADD COLUMN IF NOT EXISTS `source` enum('manual','automatico','outra_igreja') NOT NULL DEFAULT 'manual', ADD COLUMN IF NOT EXISTS `sourceRef` varchar(80) NULL;
