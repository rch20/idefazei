CREATE TABLE `ministry_role_definitions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`ministryId` int,
	`key` varchar(100) NOT NULL,
	`name` varchar(120) NOT NULL,
	`permissionPackage` enum('member','cell_leader','consolidator','visitor','treasurer','ministry_leader','communication_leader') NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`createdByChurchUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ministry_role_definitions_id` PRIMARY KEY(`id`),
	CONSTRAINT `ministry_role_definition_key_idx` UNIQUE(`churchId`,`key`)
);
