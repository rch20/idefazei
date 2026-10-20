-- Configurações globais da plataforma (contatos públicos da página de venda), editáveis pelo Super Admin.
CREATE TABLE IF NOT EXISTS `platform_settings` (
  `settingKey` varchar(64) NOT NULL,
  `settingValue` text NOT NULL,
  `updatedBy` varchar(160) NULL,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`settingKey`)
);
