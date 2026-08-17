CREATE TABLE `care_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`personId` int NOT NULL,
	`responsiblePersonId` int NOT NULL,
	`role` enum('quem_ganhou','consolidador','lider_celula','discipulador','pastor') NOT NULL,
	`notes` text,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`endedAt` timestamp,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `care_assignments_id` PRIMARY KEY(`id`)
);
