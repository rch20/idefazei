-- Estrutura aditiva para estudos semanais da Escola de Fundamentos.
-- Não altera o progresso legado e não executa DML em dados existentes.

CREATE TABLE IF NOT EXISTS foundation_study_blocks (
  id INT NOT NULL AUTO_INCREMENT,
  churchId INT NOT NULL,
  studyId INT NOT NULL,
  title VARCHAR(160) NOT NULL,
  content TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  createdByChurchUserId INT NOT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY foundation_study_blocks_church_study_position_idx (churchId, studyId, position)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS foundation_questions (
  id INT NOT NULL AUTO_INCREMENT,
  churchId INT NOT NULL,
  blockId INT NOT NULL,
  prompt TEXT NOT NULL,
  options JSON NOT NULL,
  correctOptionId VARCHAR(80) NOT NULL,
  explanation TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  createdByChurchUserId INT NOT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY foundation_questions_church_block_position_idx (churchId, blockId, position)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS foundation_question_attempts (
  id INT NOT NULL AUTO_INCREMENT,
  churchId INT NOT NULL,
  enrollmentId INT NOT NULL,
  questionId INT NOT NULL,
  selectedOptionId VARCHAR(80) NOT NULL,
  isCorrect BOOLEAN NOT NULL,
  attemptNumber INT NOT NULL,
  answeredAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY foundation_question_attempts_church_enrollment_question_idx (churchId, enrollmentId, questionId)
) ENGINE=InnoDB;
