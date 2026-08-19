CREATE TABLE `financial_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`type` enum('caixa','banco','outro') NOT NULL,
	`openingBalanceCents` int NOT NULL DEFAULT 0,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `financial_accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `financial_accounts_church_name_unique` UNIQUE(`churchId`,`name`)
);
--> statement-breakpoint
CREATE TABLE `financial_audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`transactionId` int,
	`actorChurchUserId` int NOT NULL,
	`action` enum('criado','atualizado','confirmado','estornado','periodo_fechado','periodo_reaberto') NOT NULL,
	`beforeData` json,
	`afterData` json,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `financial_audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `financial_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`type` enum('entrada','saida') NOT NULL,
	`key` varchar(80) NOT NULL,
	`name` varchar(120) NOT NULL,
	`isSystem` boolean NOT NULL DEFAULT false,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `financial_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `financial_categories_church_type_key_unique` UNIQUE(`churchId`,`type`,`key`)
);
--> statement-breakpoint
CREATE TABLE `financial_period_closures` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`periodStart` date NOT NULL,
	`periodEnd` date NOT NULL,
	`status` enum('fechado','reaberto') NOT NULL DEFAULT 'fechado',
	`closedByChurchUserId` int NOT NULL,
	`closedAt` timestamp NOT NULL DEFAULT (now()),
	`reopenedByChurchUserId` int,
	`reopenedAt` timestamp,
	`reopeningReason` text,
	CONSTRAINT `financial_period_closures_id` PRIMARY KEY(`id`),
	CONSTRAINT `financial_period_closures_church_period_unique` UNIQUE(`churchId`,`periodStart`)
);
--> statement-breakpoint
CREATE TABLE `financial_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`accountId` int NOT NULL,
	`categoryId` int NOT NULL,
	`type` enum('entrada','saida') NOT NULL,
	`amountCents` int NOT NULL,
	`transactionDate` date NOT NULL,
	`paymentMethod` enum('dinheiro','pix','transferencia','cartao','cheque','outro') NOT NULL DEFAULT 'dinheiro',
	`description` text,
	`reference` varchar(160),
	`status` enum('rascunho','confirmado','estornado') NOT NULL DEFAULT 'rascunho',
	`createdByChurchUserId` int NOT NULL,
	`confirmedByChurchUserId` int,
	`confirmedAt` timestamp,
	`reversedByChurchUserId` int,
	`reversedAt` timestamp,
	`reversalReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `financial_transactions_id` PRIMARY KEY(`id`)
);
