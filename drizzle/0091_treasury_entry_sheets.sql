-- Etapa 3A: ficha financeira de entradas por culto.
-- Esta migration não cria lançamentos no livro-caixa, não altera saldos e não migra dados existentes.
CREATE TABLE IF NOT EXISTS treasury_entry_sheets (
  id INT NOT NULL AUTO_INCREMENT,
  churchId INT NOT NULL,
  serviceId INT NOT NULL,
  status ENUM('rascunho', 'finalizada') NOT NULL DEFAULT 'rascunho',
  totalCents INT NOT NULL DEFAULT 0,
  notes TEXT NULL,
  createdByChurchUserId INT NOT NULL,
  updatedByChurchUserId INT NOT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY treasury_entry_sheets_church_service_unique (churchId, serviceId),
  KEY treasury_entry_sheets_church_status_idx (churchId, status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS treasury_entry_sheet_lines (
  id INT NOT NULL AUTO_INCREMENT,
  churchId INT NOT NULL,
  entrySheetId INT NOT NULL,
  contributionType ENUM('dizimo', 'oferta', 'oferta_especial', 'outra') NOT NULL,
  paymentMethod ENUM('dinheiro', 'pix', 'transferencia', 'cartao', 'cheque', 'outro') NOT NULL,
  amountCents INT NOT NULL,
  description VARCHAR(160) NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY treasury_entry_sheet_lines_church_sheet_idx (churchId, entrySheetId)
) ENGINE=InnoDB;
