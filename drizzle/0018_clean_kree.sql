CREATE TABLE `financial_reconciliations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`accountId` int NOT NULL,
	`periodStart` date NOT NULL,
	`periodEnd` date NOT NULL,
	`bankClosingBalanceCents` int NOT NULL,
	`bookBalanceCents` int NOT NULL,
	`differenceCents` int NOT NULL,
	`status` enum('em_andamento','conciliada','com_divergencia') NOT NULL DEFAULT 'em_andamento',
	`notes` text,
	`reconciledByChurchUserId` int NOT NULL,
	`reconciledAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `financial_reconciliations_id` PRIMARY KEY(`id`),
	CONSTRAINT `financial_reconciliations_church_account_period_unique` UNIQUE(`churchId`,`accountId`,`periodStart`)
);
--> statement-breakpoint
ALTER TABLE `financial_transactions` ADD `contributorPersonId` int;--> statement-breakpoint
ALTER TABLE `financial_transactions` ADD `contributorName` varchar(255);