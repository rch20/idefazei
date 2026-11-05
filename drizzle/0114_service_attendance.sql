-- Presença no culto: limite de faltas seguidas que aciona o alerta no Radar (padrão 3).
ALTER TABLE `churches` ADD COLUMN `serviceAbsenceAlertThreshold` int NOT NULL DEFAULT 3;--> statement-breakpoint
-- Presença nominal por culto (ausência = ausência de linha). `source` já pronto para o facial (fase 2).
CREATE TABLE `service_attendance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`serviceId` int NOT NULL,
	`personId` int NOT NULL,
	`status` enum('presente','justificado') NOT NULL DEFAULT 'presente',
	`source` enum('manual','facial') NOT NULL DEFAULT 'manual',
	`markedByChurchUserId` int NOT NULL,
	`markedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `service_attendance_id` PRIMARY KEY(`id`)
);--> statement-breakpoint
CREATE UNIQUE INDEX `service_attendance_unique` ON `service_attendance` (`churchId`,`serviceId`,`personId`);--> statement-breakpoint
CREATE INDEX `service_attendance_service_idx` ON `service_attendance` (`churchId`,`serviceId`);--> statement-breakpoint
CREATE INDEX `service_attendance_person_idx` ON `service_attendance` (`churchId`,`personId`);--> statement-breakpoint
-- Sessão de marcação do culto: contagem de visitantes e estado (aberta/fechada).
CREATE TABLE `service_attendance_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`serviceId` int NOT NULL,
	`visitorsCount` int NOT NULL DEFAULT 0,
	`status` enum('aberta','fechada') NOT NULL DEFAULT 'aberta',
	`openedByChurchUserId` int NOT NULL,
	`closedByChurchUserId` int,
	`closedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `service_attendance_sessions_id` PRIMARY KEY(`id`)
);--> statement-breakpoint
CREATE UNIQUE INDEX `service_attendance_sessions_unique` ON `service_attendance_sessions` (`churchId`,`serviceId`);
