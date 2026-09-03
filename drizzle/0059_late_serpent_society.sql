CREATE TABLE `pastoral_coverage_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`pastorPersonId` int NOT NULL,
	`coveringPastorPersonId` int,
	`coveringChurchName` varchar(255) NOT NULL,
	`coveringPastorName` varchar(255) NOT NULL,
	`coveringPastorPhone` varchar(20),
	`coveringPastorWhatsapp` varchar(20),
	`notes` text,
	`action` enum('criada','atualizada','removida') NOT NULL,
	`changedByChurchUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pastoral_coverage_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pastoral_coverages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`pastorPersonId` int NOT NULL,
	`coveringPastorPersonId` int,
	`coveringChurchName` varchar(255) NOT NULL,
	`coveringPastorName` varchar(255) NOT NULL,
	`coveringPastorPhone` varchar(20),
	`coveringPastorWhatsapp` varchar(20),
	`notes` text,
	`updatedByChurchUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pastoral_coverages_id` PRIMARY KEY(`id`),
	CONSTRAINT `pastoral_coverages_pastor_unique` UNIQUE(`churchId`,`pastorPersonId`)
);
--> statement-breakpoint
CREATE INDEX `pastoral_coverage_events_church_pastor_idx` ON `pastoral_coverage_events` (`churchId`,`pastorPersonId`);--> statement-breakpoint
CREATE INDEX `pastoral_coverage_events_pastor_created_idx` ON `pastoral_coverage_events` (`pastorPersonId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `pastoral_coverages_church_idx` ON `pastoral_coverages` (`churchId`);--> statement-breakpoint
CREATE INDEX `pastoral_coverages_covering_pastor_idx` ON `pastoral_coverages` (`churchId`,`coveringPastorPersonId`);