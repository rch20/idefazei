CREATE TABLE `church_notification_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`eventType` enum('cadastro_pendente','pessoa_aprovada','visita_agendada','lembrete_visita','visita_nao_realizada','responsabilidade_atribuida','funcao_ministerial_atribuida','evento_igreja','comunicado_lideranca','encaminhamento_sem_aceite') NOT NULL,
	`channel` enum('sistema','whatsapp') NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `church_notification_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `church_notification_preferences_unique` UNIQUE(`churchId`,`eventType`,`channel`)
);
--> statement-breakpoint
CREATE TABLE `notification_deliveries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`eventId` int NOT NULL,
	`recipientChurchUserId` int NOT NULL,
	`channel` enum('sistema','whatsapp') NOT NULL,
	`status` enum('pendente','entregue','lida','ignorada','falhou') NOT NULL DEFAULT 'pendente',
	`deliveredAt` timestamp,
	`readAt` timestamp,
	`providerMessageId` varchar(255),
	`failureReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notification_deliveries_id` PRIMARY KEY(`id`),
	CONSTRAINT `notification_deliveries_event_recipient_channel_unique` UNIQUE(`eventId`,`recipientChurchUserId`,`channel`)
);
--> statement-breakpoint
CREATE TABLE `notification_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`type` enum('cadastro_pendente','pessoa_aprovada','visita_agendada','lembrete_visita','visita_nao_realizada','responsabilidade_atribuida','funcao_ministerial_atribuida','evento_igreja','comunicado_lideranca','encaminhamento_sem_aceite') NOT NULL,
	`entityType` varchar(80),
	`entityId` int,
	`title` varchar(255) NOT NULL,
	`body` text NOT NULL,
	`metadata` json,
	`dedupeKey` varchar(190),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notification_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `notification_events_church_dedupe_unique` UNIQUE(`churchId`,`dedupeKey`)
);
--> statement-breakpoint
CREATE INDEX `notification_deliveries_recipient_status_idx` ON `notification_deliveries` (`churchId`,`recipientChurchUserId`,`status`);--> statement-breakpoint
CREATE INDEX `notification_events_church_created_idx` ON `notification_events` (`churchId`,`createdAt`);