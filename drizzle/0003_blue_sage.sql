CREATE TABLE `onboarding_progress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`stepWelcome` boolean NOT NULL DEFAULT false,
	`stepImportMembers` boolean NOT NULL DEFAULT false,
	`stepCreateCell` boolean NOT NULL DEFAULT false,
	`stepInviteLeaders` boolean NOT NULL DEFAULT false,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `onboarding_progress_id` PRIMARY KEY(`id`)
);
