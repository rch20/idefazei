CREATE TABLE `consolidation_referrals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`personId` int NOT NULL,
	`referredByPersonId` int NOT NULL,
	`preferredConsolidatorId` int,
	`acceptedByPersonId` int,
	`reason` varchar(255) NOT NULL,
	`notes` text,
	`status` enum('pendente','aceito','em_acompanhamento','encerrado','cancelado') NOT NULL DEFAULT 'pendente',
	`referredAt` timestamp NOT NULL DEFAULT (now()),
	`acceptedAt` timestamp,
	`firstContactAt` timestamp,
	`closedAt` timestamp,
	`closeNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `consolidation_referrals_id` PRIMARY KEY(`id`)
);
