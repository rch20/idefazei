CREATE TABLE IF NOT EXISTS `treasury_report_signatures` (
  `id` int NOT NULL AUTO_INCREMENT,
  `churchId` int NOT NULL,
  `reportId` int NOT NULL,
  `role` enum('contador1','contador2','tesoureiro','pastor') NOT NULL,
  `signedByChurchUserId` int NOT NULL,
  `signedByPersonId` int NULL,
  `signedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `treasury_report_signatures_church_report_role_unique` (`churchId`,`reportId`,`role`),
  KEY `treasury_report_signatures_church_report_idx` (`churchId`,`reportId`)
);
