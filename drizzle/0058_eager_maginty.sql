CREATE TABLE `discipleship_stage_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`personId` int NOT NULL,
	`stage` enum('nova_alma','consolidacao','fundamentos','celula','batismo','encontro_com_deus','escola_de_lideres','lideranca','multiplicador') NOT NULL,
	`status` enum('concluida','pendente','nao_registrada') NOT NULL,
	`notes` text,
	`changedByChurchUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `discipleship_stage_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `discipleship_stage_events_church_person_idx` ON `discipleship_stage_events` (`churchId`,`personId`);--> statement-breakpoint
CREATE INDEX `discipleship_stage_events_person_created_idx` ON `discipleship_stage_events` (`personId`,`createdAt`);