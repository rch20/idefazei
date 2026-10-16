CREATE TABLE `foundation_studies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`courseId` int NOT NULL,
	`title` varchar(160) NOT NULL,
	`summary` varchar(500),
	`content` text,
	`position` int NOT NULL DEFAULT 0,
	`active` boolean NOT NULL DEFAULT true,
	`createdByChurchUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `foundation_studies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `foundation_study_administrators` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`churchUserId` int NOT NULL,
	`assignedByChurchUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `foundation_study_administrators_id` PRIMARY KEY(`id`),
	CONSTRAINT `foundation_study_administrators_church_user_unique` UNIQUE(`churchId`,`churchUserId`)
);
--> statement-breakpoint
CREATE INDEX `foundation_studies_church_course_position_idx` ON `foundation_studies` (`churchId`,`courseId`,`position`);--> statement-breakpoint
CREATE INDEX `foundation_study_administrators_church_idx` ON `foundation_study_administrators` (`churchId`);