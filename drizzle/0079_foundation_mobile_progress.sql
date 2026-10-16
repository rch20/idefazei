-- Evolução aditiva do fluxo mobile-first da Escola de Fundamentos.
-- Não altera dados existentes; adiciona progresso por bloco e correlação idempotente.

CREATE TABLE IF NOT EXISTS foundation_block_progress (
  id INT NOT NULL AUTO_INCREMENT,
  churchId INT NOT NULL,
  enrollmentId INT NOT NULL,
  studyId INT NOT NULL,
  blockId INT NOT NULL,
  status ENUM('em_andamento', 'concluida') NOT NULL DEFAULT 'em_andamento',
  firstViewedAt TIMESTAMP NULL,
  lastViewedAt TIMESTAMP NULL,
  completedAt TIMESTAMP NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY foundation_block_progress_church_enrollment_study_idx (churchId, enrollmentId, studyId),
  KEY foundation_block_progress_church_study_block_idx (churchId, studyId, blockId),
  UNIQUE KEY foundation_block_progress_enrollment_study_block_unique (churchId, enrollmentId, studyId, blockId)
) ENGINE=InnoDB;

ALTER TABLE foundation_question_attempts
  ADD COLUMN IF NOT EXISTS clientAttemptId VARCHAR(80) NULL AFTER attemptNumber;

CREATE UNIQUE INDEX IF NOT EXISTS foundation_question_attempts_client_id_unique
  ON foundation_question_attempts (churchId, enrollmentId, questionId, clientAttemptId);
