-- 0098: estrutura pedagógica independente da Escola de Líderes.
-- Migration ADITIVA: não altera nem migra turmas, matrículas, aulas,
-- presenças, revisões ou progresso legado de leadership_school_*.
-- Não aplicar por db:push; usar o executor seletivo de migrations após
-- revisão, backup e autorização operacional específica.
-- O conteúdo novo é separado de foundation_*; library_items continua sendo
-- somente um acervo tenant-aware compartilhado por referência.

CREATE TABLE IF NOT EXISTS `leadership_school_modules` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `churchId` INT NOT NULL,
  `classId` INT NOT NULL,
  `title` VARCHAR(160) NOT NULL,
  `description` VARCHAR(500) NULL,
  `position` INT NOT NULL DEFAULT 0,
  `active` BOOLEAN NOT NULL DEFAULT TRUE,
  `createdByChurchUserId` INT NOT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `leadership_school_modules_church_class_position_idx` (`churchId`, `classId`, `position`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `leadership_school_studies` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `churchId` INT NOT NULL,
  `classId` INT NOT NULL,
  `moduleId` INT NULL,
  `title` VARCHAR(160) NOT NULL,
  `weekStart` DATE NULL,
  `summary` VARCHAR(500) NULL,
  `content` TEXT NULL,
  `position` INT NOT NULL DEFAULT 0,
  `status` ENUM('rascunho', 'publicada', 'arquivada') NOT NULL DEFAULT 'rascunho',
  `publishedAt` TIMESTAMP NULL,
  `publishedByChurchUserId` INT NULL,
  `active` BOOLEAN NOT NULL DEFAULT TRUE,
  `createdByChurchUserId` INT NOT NULL,
  `clientRequestId` VARCHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `requestHash` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `requestSchemaVersion` INT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `leadership_school_studies_church_class_position_idx` (`churchId`, `classId`, `position`),
  KEY `leadership_school_studies_church_module_position_idx` (`churchId`, `moduleId`, `position`),
  KEY `leadership_school_studies_church_class_status_week_idx` (`churchId`, `classId`, `status`, `weekStart`),
  UNIQUE KEY `leadership_school_studies_church_author_request_unique` (`churchId`, `createdByChurchUserId`, `clientRequestId`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `leadership_school_study_blocks` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `churchId` INT NOT NULL,
  `studyId` INT NOT NULL,
  `stageKey` ENUM('leia', 'entenda', 'responda', 'aplique') NOT NULL,
  `title` VARCHAR(160) NOT NULL,
  `content` TEXT NOT NULL,
  `reflectionPrompt` TEXT NULL,
  `position` INT NOT NULL DEFAULT 0,
  `active` BOOLEAN NOT NULL DEFAULT TRUE,
  `createdByChurchUserId` INT NOT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `leadership_school_study_blocks_church_study_position_idx` (`churchId`, `studyId`, `position`),
  KEY `leadership_school_study_blocks_church_study_stage_idx` (`churchId`, `studyId`, `stageKey`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `leadership_school_questions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `churchId` INT NOT NULL,
  `blockId` INT NOT NULL,
  `prompt` TEXT NOT NULL,
  `options` JSON NOT NULL,
  `correctOptionId` VARCHAR(80) NOT NULL,
  `explanation` TEXT NOT NULL,
  `position` INT NOT NULL DEFAULT 0,
  `active` BOOLEAN NOT NULL DEFAULT TRUE,
  `createdByChurchUserId` INT NOT NULL,
  `clientRequestId` VARCHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `requestHash` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `requestSchemaVersion` INT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `leadership_school_questions_church_block_position_idx` (`churchId`, `blockId`, `position`),
  UNIQUE KEY `leadership_school_questions_church_author_request_unique` (`churchId`, `createdByChurchUserId`, `clientRequestId`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `leadership_school_question_attempts` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `churchId` INT NOT NULL,
  `enrollmentId` INT NOT NULL,
  `questionId` INT NOT NULL,
  `selectedOptionId` VARCHAR(80) NOT NULL,
  `isCorrect` BOOLEAN NOT NULL,
  `attemptNumber` INT NOT NULL,
  `clientAttemptId` VARCHAR(80) NULL,
  `answeredAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `leadership_school_attempts_church_enrollment_question_idx` (`churchId`, `enrollmentId`, `questionId`),
  UNIQUE KEY `leadership_school_question_attempts_client_unique` (`churchId`, `enrollmentId`, `questionId`, `clientAttemptId`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `leadership_school_study_materials` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `churchId` INT NOT NULL,
  `studyId` INT NOT NULL,
  `libraryItemId` INT NOT NULL,
  `position` INT NOT NULL DEFAULT 0,
  `notes` TEXT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `leadership_school_study_materials_church_study_position_idx` (`churchId`, `studyId`, `position`),
  UNIQUE KEY `leadership_school_study_materials_study_library_unique` (`churchId`, `studyId`, `libraryItemId`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `leadership_school_study_progress` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `churchId` INT NOT NULL,
  `enrollmentId` INT NOT NULL,
  `studyId` INT NOT NULL,
  `status` ENUM('nao_iniciada', 'em_andamento', 'concluida') NOT NULL DEFAULT 'nao_iniciada',
  `lastBlockPosition` INT NOT NULL DEFAULT 0,
  `startedAt` TIMESTAMP NULL,
  `lastAccessedAt` TIMESTAMP NULL,
  `completedAt` TIMESTAMP NULL,
  `reflection` TEXT NULL,
  `reflectionVersion` INT NOT NULL DEFAULT 0,
  `reviewStatus` ENUM('pendente', 'compreendeu', 'precisa_reforco', 'nao_participou') NOT NULL DEFAULT 'pendente',
  `reviewNotes` TEXT NULL,
  `reviewedAt` TIMESTAMP NULL,
  `reviewedByChurchUserId` INT NULL,
  `releasedAt` TIMESTAMP NULL,
  `releasedByChurchUserId` INT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `leadership_school_study_progress_church_enrollment_idx` (`churchId`, `enrollmentId`),
  KEY `leadership_school_study_progress_church_study_idx` (`churchId`, `studyId`),
  UNIQUE KEY `leadership_school_study_progress_unique` (`churchId`, `enrollmentId`, `studyId`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `leadership_school_block_progress` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `churchId` INT NOT NULL,
  `enrollmentId` INT NOT NULL,
  `studyId` INT NOT NULL,
  `blockId` INT NOT NULL,
  `status` ENUM('em_andamento', 'concluida') NOT NULL DEFAULT 'em_andamento',
  `firstViewedAt` TIMESTAMP NULL,
  `lastViewedAt` TIMESTAMP NULL,
  `completedAt` TIMESTAMP NULL,
  `reflection` TEXT NULL,
  `reflectionVersion` INT NOT NULL DEFAULT 0,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `leadership_school_block_progress_church_enrollment_study_idx` (`churchId`, `enrollmentId`, `studyId`),
  KEY `leadership_school_block_progress_church_study_block_idx` (`churchId`, `studyId`, `blockId`),
  UNIQUE KEY `leadership_school_block_progress_unique` (`churchId`, `enrollmentId`, `studyId`, `blockId`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `leadership_school_lesson_studies` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `churchId` INT NOT NULL,
  `lessonId` INT NOT NULL,
  `studyId` INT NOT NULL,
  `createdByChurchUserId` INT NOT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `leadership_school_lesson_studies_church_lesson_idx` (`churchId`, `lessonId`),
  UNIQUE KEY `leadership_school_lesson_studies_unique` (`churchId`, `lessonId`, `studyId`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `leadership_school_study_administrators` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `churchId` INT NOT NULL,
  `churchUserId` INT NOT NULL,
  `assignedByChurchUserId` INT NOT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `leadership_school_study_administrators_church_idx` (`churchId`),
  UNIQUE KEY `leadership_school_study_administrators_unique` (`churchId`, `churchUserId`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `leadership_school_import_drafts` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `churchId` INT NOT NULL,
  `classId` INT NOT NULL,
  `createdByChurchUserId` INT NOT NULL,
  `sourceFilename` VARCHAR(255) NOT NULL,
  `fileSha256` VARCHAR(64) NOT NULL,
  `status` ENUM('pendente', 'confirmado', 'cancelado', 'expirado') NOT NULL DEFAULT 'pendente',
  `payload` JSON NOT NULL,
  `summary` JSON NOT NULL,
  `expiresAt` TIMESTAMP NOT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `confirmedAt` TIMESTAMP NULL,
  PRIMARY KEY (`id`),
  KEY `leadership_school_import_drafts_church_user_status_idx` (`churchId`, `createdByChurchUserId`, `status`),
  KEY `leadership_school_import_drafts_church_expires_idx` (`churchId`, `expiresAt`)
) ENGINE=InnoDB;
