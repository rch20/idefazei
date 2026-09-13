CREATE TABLE `public_registration_leads` (
  `id` int AUTO_INCREMENT NOT NULL,
  `churchId` int NOT NULL,
  `soulId` int,
  `identityHash` varchar(64) NOT NULL,
  `name` varchar(255) NOT NULL,
  `whatsapp` varchar(20) NOT NULL,
  `email` varchar(320),
  `zipCode` varchar(9),
  `street` varchar(255),
  `number` varchar(10),
  `neighborhood` varchar(100),
  `city` varchar(100),
  `state` varchar(2),
  `source` enum('qrcode','convite','evento','link') NOT NULL DEFAULT 'qrcode',
  `campaign` varchar(120),
  `consentAccepted` boolean NOT NULL,
  `consentVersion` varchar(20) NOT NULL DEFAULT 'v1',
  `status` enum('novo','em_atendimento','convertido','encerrado') NOT NULL DEFAULT 'novo',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `public_registration_leads_id` PRIMARY KEY(`id`),
  CONSTRAINT `public_registration_leads_church_identity_unique` UNIQUE(`churchId`,`identityHash`)
);
--> statement-breakpoint
CREATE INDEX `public_registration_leads_church_status_idx` ON `public_registration_leads` (`churchId`,`status`,`createdAt`);
--> statement-breakpoint
CREATE INDEX `public_registration_leads_church_soul_idx` ON `public_registration_leads` (`churchId`,`soulId`);
