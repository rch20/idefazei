CREATE TABLE `treasury_count_sheets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`serviceId` int NOT NULL,
	`counterOnePersonId` int NOT NULL,
	`counterTwoPersonId` int NOT NULL,
	`cashCents` int NOT NULL DEFAULT 0,
	`pixCents` int NOT NULL DEFAULT 0,
	`transferCents` int NOT NULL DEFAULT 0,
	`cardCents` int NOT NULL DEFAULT 0,
	`checkCents` int NOT NULL DEFAULT 0,
	`otherCents` int NOT NULL DEFAULT 0,
	`totalCents` int NOT NULL DEFAULT 0,
	`status` enum('rascunho','conferida','fechada') NOT NULL DEFAULT 'rascunho',
	`notes` text,
	`confirmedAt` timestamp,
	`confirmedByChurchUserId` int,
	`createdByChurchUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `treasury_count_sheets_id` PRIMARY KEY(`id`),
	CONSTRAINT `treasury_count_sheets_church_service_unique` UNIQUE(`churchId`,`serviceId`)
);
--> statement-breakpoint
CREATE TABLE `treasury_deposits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`countSheetId` int NOT NULL,
	`accountId` int NOT NULL,
	`amountCents` int NOT NULL,
	`depositDate` date NOT NULL,
	`reference` varchar(160),
	`notes` text,
	`status` enum('pendente','depositado','conferido') NOT NULL DEFAULT 'pendente',
	`depositedByChurchUserId` int,
	`depositedAt` timestamp,
	`createdByChurchUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `treasury_deposits_id` PRIMARY KEY(`id`),
	CONSTRAINT `treasury_deposits_church_count_sheet_unique` UNIQUE(`churchId`,`countSheetId`)
);
--> statement-breakpoint
CREATE TABLE `treasury_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`serviceId` int NOT NULL,
	`countSheetId` int NOT NULL,
	`reportType` enum('culto_diario') NOT NULL DEFAULT 'culto_diario',
	`version` int NOT NULL DEFAULT 1,
	`status` enum('emitido','assinado') NOT NULL DEFAULT 'emitido',
	`snapshot` json NOT NULL,
	`issuedByChurchUserId` int NOT NULL,
	`issuedAt` timestamp NOT NULL DEFAULT (now()),
	`signedByCounterOneAt` timestamp,
	`signedByCounterTwoAt` timestamp,
	`signedByTreasurerAt` timestamp,
	`signedByPastorAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `treasury_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `treasury_services` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`serviceDate` date NOT NULL,
	`startTime` varchar(5),
	`location` varchar(160),
	`notes` text,
	`status` enum('aberto','fechado','cancelado') NOT NULL DEFAULT 'aberto',
	`createdByChurchUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `treasury_services_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `financial_transactions` ADD `serviceId` int;--> statement-breakpoint
ALTER TABLE `financial_transactions` ADD `countSheetId` int;--> statement-breakpoint
CREATE INDEX `treasury_reports_church_service_idx` ON `treasury_reports` (`churchId`,`serviceId`);--> statement-breakpoint
CREATE INDEX `treasury_services_church_date_idx` ON `treasury_services` (`churchId`,`serviceDate`);