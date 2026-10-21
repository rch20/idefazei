-- Trilho de configuração do primeiro acesso: passos que a igreja pulou por enquanto (os demais são conferidos pelos próprios dados).
CREATE TABLE IF NOT EXISTS `church_setup_skips` (
  `id` int AUTO_INCREMENT NOT NULL,
  `churchId` int NOT NULL,
  `stepKey` varchar(32) NOT NULL,
  `skippedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `church_setup_skips_id` PRIMARY KEY(`id`),
  UNIQUE KEY `church_setup_skips_church_step_unique` (`churchId`, `stepKey`)
);
