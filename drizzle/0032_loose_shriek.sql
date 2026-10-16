CREATE TABLE `foundation_modules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`courseId` int NOT NULL,
	`title` varchar(160) NOT NULL,
	`description` varchar(500),
	`position` int NOT NULL DEFAULT 0,
	`active` boolean NOT NULL DEFAULT true,
	`createdByChurchUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `foundation_modules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `foundation_studies` ADD `moduleId` int;--> statement-breakpoint
CREATE INDEX `foundation_modules_church_course_position_idx` ON `foundation_modules` (`churchId`,`courseId`,`position`);--> statement-breakpoint
CREATE INDEX `foundation_studies_church_module_position_idx` ON `foundation_studies` (`churchId`,`moduleId`,`position`);