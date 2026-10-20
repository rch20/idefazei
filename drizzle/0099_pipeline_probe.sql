-- Tabela de verificação do pipeline de banco (backup antes, aplicador aditivo e registro no ledger).
-- Não é usada pela aplicação; pode ser ignorada.
CREATE TABLE IF NOT EXISTS `idefazei_pipeline_probe` (
  `id` int AUTO_INCREMENT NOT NULL,
  `note` varchar(120) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);
