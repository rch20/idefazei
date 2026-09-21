-- Estrutura aditiva para separar a preparação digital da aula presencial.
-- Não altera registros existentes e não executa DML sobre dados legados.

ALTER TABLE foundation_studies
  ADD COLUMN IF NOT EXISTS weekStart DATE NULL AFTER title;

CREATE TABLE IF NOT EXISTS foundation_classes (
  id INT NOT NULL AUTO_INCREMENT,
  churchId INT NOT NULL,
  courseId INT NOT NULL,
  studyId INT NOT NULL,
  classDate DATE NOT NULL,
  status ENUM('planejada', 'realizada', 'cancelada') NOT NULL DEFAULT 'planejada',
  notes TEXT NULL,
  createdByChurchUserId INT NOT NULL,
  updatedByChurchUserId INT NOT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY foundation_classes_church_study_date_idx (churchId, studyId, classDate),
  UNIQUE KEY foundation_classes_church_study_date_unique (churchId, studyId, classDate)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS foundation_class_attendance (
  id INT NOT NULL AUTO_INCREMENT,
  churchId INT NOT NULL,
  classId INT NOT NULL,
  enrollmentId INT NOT NULL,
  status ENUM('presente', 'ausente', 'justificado') NOT NULL,
  notes TEXT NULL,
  recordedByChurchUserId INT NOT NULL,
  recordedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY foundation_class_attendance_church_class_status_idx (churchId, classId, status),
  UNIQUE KEY foundation_class_attendance_class_enrollment_unique (churchId, classId, enrollmentId)
) ENGINE=InnoDB;
