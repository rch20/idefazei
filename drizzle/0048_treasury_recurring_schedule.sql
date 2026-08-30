CREATE TABLE `treasury_recurring_schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`weekday` int NOT NULL,
	`startTime` varchar(5) NOT NULL,
	`location` varchar(160),
	`notes` text,
	`active` boolean NOT NULL DEFAULT true,
	`createdByChurchUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `treasury_recurring_schedules_id` PRIMARY KEY(`id`),
	CONSTRAINT `treasury_recurring_schedules_church_slot_unique` UNIQUE(`churchId`,`weekday`,`startTime`,`name`)
);
--> statement-breakpoint
ALTER TABLE `treasury_services` ADD `origin` enum('manual','recorrente') DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE `treasury_services` ADD `recurringScheduleId` int;--> statement-breakpoint
ALTER TABLE `treasury_services` ADD `occurrenceOverride` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `treasury_services` ADD CONSTRAINT `treasury_services_church_schedule_date_unique` UNIQUE(`churchId`,`recurringScheduleId`,`serviceDate`);--> statement-breakpoint
CREATE INDEX `treasury_recurring_schedules_church_active_idx` ON `treasury_recurring_schedules` (`churchId`,`active`);