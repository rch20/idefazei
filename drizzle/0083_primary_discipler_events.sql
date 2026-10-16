-- Histórico append-only das alterações do discipulador principal.
-- Não altera dados existentes nem substitui people.discipledById ou care_assignments.
CREATE TABLE IF NOT EXISTS primary_discipler_events (
  id INT NOT NULL AUTO_INCREMENT,
  churchId INT NOT NULL,
  personId INT NOT NULL,
  previousDisciplerPersonId INT NULL,
  nextDisciplerPersonId INT NULL,
  action ENUM('definido', 'alterado', 'removido') NOT NULL,
  reason TEXT NOT NULL,
  changedByChurchUserId INT NOT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY primary_discipler_events_church_person_created_idx (churchId, personId, createdAt),
  KEY primary_discipler_events_church_actor_created_idx (churchId, changedByChurchUserId, createdAt)
) ENGINE=InnoDB;
