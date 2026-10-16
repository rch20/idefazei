CREATE TABLE `ministry_role_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`ministryId` int NOT NULL,
	`personId` int NOT NULL,
	`roleKey` varchar(100) NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`assignedByChurchUserId` int,
	`assignedAt` timestamp NOT NULL DEFAULT (now()),
	`endedAt` timestamp,
	CONSTRAINT `ministry_role_assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `consolidation_follow_ups` ADD `visitAssigneePersonId` int;--> statement-breakpoint
ALTER TABLE `consolidation_follow_ups` ADD `visitScheduledAt` timestamp;