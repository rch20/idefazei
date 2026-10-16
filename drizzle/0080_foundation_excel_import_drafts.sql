-- Importação editorial segura da Escola de Fundamentos.
-- O upload cria somente um rascunho temporário; conteúdo pedagógico nasce na confirmação.

CREATE TABLE IF NOT EXISTS foundation_import_drafts (
  id INT NOT NULL AUTO_INCREMENT,
  churchId INT NOT NULL,
  courseId INT NOT NULL,
  createdByChurchUserId INT NOT NULL,
  sourceFilename VARCHAR(255) NOT NULL,
  fileSha256 VARCHAR(64) NOT NULL,
  status ENUM('pendente', 'confirmado', 'cancelado', 'expirado') NOT NULL DEFAULT 'pendente',
  payload JSON NOT NULL,
  summary JSON NOT NULL,
  expiresAt TIMESTAMP NOT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  confirmedAt TIMESTAMP NULL,
  PRIMARY KEY (id),
  KEY foundation_import_drafts_church_user_status_idx (churchId, createdByChurchUserId, status),
  KEY foundation_import_drafts_church_expires_idx (churchId, expiresAt)
) ENGINE=InnoDB;
