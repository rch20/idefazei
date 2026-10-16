CREATE TABLE `department_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`departmentId` int NOT NULL,
	`personId` int NOT NULL,
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	`leftAt` timestamp,
	`active` boolean NOT NULL DEFAULT true,
	CONSTRAINT `department_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `department_role_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`departmentId` int NOT NULL,
	`personId` int NOT NULL,
	`roleKey` varchar(100) NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`assignedByChurchUserId` int,
	`assignedAt` timestamp NOT NULL DEFAULT (now()),
	`endedAt` timestamp,
	CONSTRAINT `department_role_assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `departments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`ministryId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`description` text,
	`leaderId` int,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `departments_id` PRIMARY KEY(`id`),
	CONSTRAINT `department_ministry_name_idx` UNIQUE(`ministryId`,`name`)
);
--> statement-breakpoint
ALTER TABLE `schedule_items` ADD `departmentId` int;--> statement-breakpoint
CREATE INDEX `department_member_department_idx` ON `department_members` (`churchId`,`departmentId`,`active`);--> statement-breakpoint
CREATE INDEX `department_member_person_idx` ON `department_members` (`churchId`,`personId`,`active`);--> statement-breakpoint
CREATE INDEX `department_role_department_idx` ON `department_role_assignments` (`churchId`,`departmentId`,`active`);--> statement-breakpoint
CREATE INDEX `department_role_person_idx` ON `department_role_assignments` (`churchId`,`personId`,`active`);--> statement-breakpoint
CREATE INDEX `department_church_ministry_idx` ON `departments` (`churchId`,`ministryId`);--> statement-breakpoint
CREATE INDEX `department_church_leader_idx` ON `departments` (`churchId`,`leaderId`);