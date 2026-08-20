CREATE TABLE `financial_reconciliation_attachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`reconciliationId` int NOT NULL,
	`fileKey` varchar(512) NOT NULL,
	`url` varchar(1024) NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`mimeType` varchar(100) NOT NULL,
	`sizeBytes` int NOT NULL,
	`uploadedByChurchUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `financial_reconciliation_attachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `financial_reconciliation_attachments_reconciliation_idx` ON `financial_reconciliation_attachments` (`churchId`,`reconciliationId`);