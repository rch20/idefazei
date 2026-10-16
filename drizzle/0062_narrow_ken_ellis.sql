CREATE TABLE `certificate_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`type` enum('fundamentos','batismo','lideres') NOT NULL,
	`modelKey` varchar(50) NOT NULL DEFAULT 'modern-v1',
	`title` varchar(160) NOT NULL,
	`subtitle` varchar(180) NOT NULL,
	`body` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `certificate_templates_id` PRIMARY KEY(`id`),
	CONSTRAINT `certificate_templates_church_type_unique` UNIQUE(`churchId`,`type`)
);
--> statement-breakpoint
CREATE INDEX `certificate_templates_church_idx` ON `certificate_templates` (`churchId`);