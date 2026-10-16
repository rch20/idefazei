CREATE TABLE `certificate_custom_types` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`modelKey` varchar(50) NOT NULL DEFAULT 'modern-v1',
	`title` varchar(160) NOT NULL,
	`subtitle` varchar(180) NOT NULL,
	`body` text NOT NULL,
	`verse` text,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `certificate_custom_types_id` PRIMARY KEY(`id`),
	CONSTRAINT `certificate_custom_types_church_name_unique` UNIQUE(`churchId`,`name`)
);
--> statement-breakpoint
CREATE INDEX `certificate_custom_types_church_idx` ON `certificate_custom_types` (`churchId`);--> statement-breakpoint
CREATE INDEX `certificate_custom_types_active_idx` ON `certificate_custom_types` (`churchId`,`active`);