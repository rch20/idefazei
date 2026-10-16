CREATE TABLE `discipleship_stage_progress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`personId` int NOT NULL,
	`stage` enum('nova_alma','consolidacao','fundamentos','celula','batismo','encontro_com_deus','escola_de_lideres','lideranca','multiplicador') NOT NULL,
	`status` enum('concluida','pendente','nao_registrada') NOT NULL DEFAULT 'nao_registrada',
	`notes` text,
	`completedAt` timestamp,
	`updatedByChurchUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `discipleship_stage_progress_id` PRIMARY KEY(`id`),
	CONSTRAINT `discipleship_stage_progress_person_stage_idx` UNIQUE(`churchId`,`personId`,`stage`)
);
--> statement-breakpoint
CREATE INDEX `discipleship_stage_progress_church_person_idx` ON `discipleship_stage_progress` (`churchId`,`personId`);