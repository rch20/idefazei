-- Cadastro público: como liberar o login de quem se cadastra pelo link/QR (manual por padrão; só vale para cadastros novos).
ALTER TABLE `churches` ADD COLUMN `publicRegistrationAccessMode` enum('manual','automatico') NOT NULL DEFAULT 'manual';
