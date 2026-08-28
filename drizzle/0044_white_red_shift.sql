CREATE TABLE `encounter_checklist_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`encounterEventId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`category` enum('estrutura','discipulos','servos','intercessao','alimentacao','logistica','comunicacao','pos_encontro','outro') NOT NULL DEFAULT 'outro',
	`assignedPersonId` int,
	`dueAt` timestamp,
	`status` enum('pendente','em_andamento','concluida','cancelada') NOT NULL DEFAULT 'pendente',
	`notes` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `encounter_checklist_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `encounter_disciple_forms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`encounterEventId` int NOT NULL,
	`encounterEnrollmentId` int NOT NULL,
	`personId` int NOT NULL,
	`fullName` varchar(255) NOT NULL,
	`age` int NOT NULL,
	`phone` varchar(20) NOT NULL,
	`guardianName` varchar(255) NOT NULL,
	`guardianPhone` varchar(20) NOT NULL,
	`friendName` varchar(255) NOT NULL,
	`friendPhone` varchar(20) NOT NULL,
	`attendingChurch` varchar(255) NOT NULL,
	`invitedByName` varchar(255) NOT NULL,
	`reviewStatus` enum('recebida','em_analise','confirmada','precisa_correcao','rejeitada') NOT NULL DEFAULT 'recebida',
	`reviewNotes` text,
	`consentAccepted` boolean NOT NULL,
	`consentVersion` varchar(20) NOT NULL DEFAULT 'v1',
	`consentAcceptedAt` timestamp NOT NULL DEFAULT (now()),
	`submittedAt` timestamp NOT NULL DEFAULT (now()),
	`reviewedAt` timestamp,
	`reviewedByPersonId` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `encounter_disciple_forms_id` PRIMARY KEY(`id`),
	CONSTRAINT `encounter_disciple_forms_enrollment_unique` UNIQUE(`churchId`,`encounterEnrollmentId`)
);
--> statement-breakpoint
CREATE TABLE `encounter_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`encounterEventId` int NOT NULL,
	`actorPersonId` int,
	`action` varchar(80) NOT NULL,
	`entityType` enum('encontro','discipulo','ficha','equipe','servo','checklist','link_publico') NOT NULL,
	`entityId` int,
	`details` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `encounter_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `encounter_public_forms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`encounterEventId` int NOT NULL,
	`publicToken` varchar(96) NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`expiresAt` timestamp,
	`revokedAt` timestamp,
	`createdByPersonId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `encounter_public_forms_id` PRIMARY KEY(`id`),
	CONSTRAINT `encounter_public_forms_token_unique` UNIQUE(`publicToken`)
);
--> statement-breakpoint
CREATE TABLE `encounter_servant_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`encounterEventId` int NOT NULL,
	`teamId` int,
	`personId` int NOT NULL,
	`roleKey` varchar(64),
	`roleName` varchar(120) NOT NULL,
	`roleSource` enum('catalogo','manual') NOT NULL DEFAULT 'catalogo',
	`assignmentType` enum('responsavel','membro','substituto') NOT NULL DEFAULT 'membro',
	`notes` text,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `encounter_servant_assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `encounter_teams` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`encounterEventId` int NOT NULL,
	`parentTeamId` int,
	`name` varchar(120) NOT NULL,
	`category` enum('lideranca','espiritual','apoio','operacional','manual') NOT NULL DEFAULT 'operacional',
	`source` enum('padrao','manual') NOT NULL DEFAULT 'padrao',
	`requiredCount` int,
	`notes` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `encounter_teams_id` PRIMARY KEY(`id`),
	CONSTRAINT `encounter_teams_event_name_unique` UNIQUE(`churchId`,`encounterEventId`,`name`)
);
--> statement-breakpoint
INSERT INTO `encounter_teams` (`churchId`,`encounterEventId`,`parentTeamId`,`name`,`category`,`source`,`requiredCount`,`sortOrder`,`active`)
SELECT `churchId`,`id`,NULL,'Supervisor Espiritual','lideranca','padrao',1,0,true FROM `encounter_events`;
--> statement-breakpoint
INSERT INTO `encounter_teams` (`churchId`,`encounterEventId`,`parentTeamId`,`name`,`category`,`source`,`requiredCount`,`sortOrder`,`active`)
SELECT `churchId`,`id`,NULL,'Coordenador','lideranca','padrao',1,1,true FROM `encounter_events`;
--> statement-breakpoint
INSERT INTO `encounter_teams` (`churchId`,`encounterEventId`,`parentTeamId`,`name`,`category`,`source`,`requiredCount`,`sortOrder`,`active`)
SELECT e.`churchId`,e.`id`,c.`id`,x.`name`,x.`category`,'padrao',NULL,x.`sortOrder`,true
FROM `encounter_events` e
INNER JOIN `encounter_teams` c ON c.`churchId` = e.`churchId` AND c.`encounterEventId` = e.`id` AND c.`name` = 'Coordenador'
CROSS JOIN (
	SELECT 'Intercessores' AS `name`, 'espiritual' AS `category`, 10 AS `sortOrder`
	UNION ALL SELECT 'Stand-by', 'apoio', 20
	UNION ALL SELECT 'Cozinha', 'operacional', 30
	UNION ALL SELECT 'Limpeza', 'operacional', 40
	UNION ALL SELECT 'Correios', 'operacional', 50
) x;
--> statement-breakpoint
ALTER TABLE `encounter_enrollments` ADD `source` enum('manual','public_form') DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE `encounter_enrollments` ADD `notes` text;--> statement-breakpoint
ALTER TABLE `encounter_enrollments` ADD `confirmedAt` timestamp;--> statement-breakpoint
ALTER TABLE `encounter_enrollments` ADD `cancelledAt` timestamp;--> statement-breakpoint
ALTER TABLE `encounter_enrollments` ADD `updatedAt` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `encounter_events` ADD `status` enum('rascunho','planejamento','confirmado','em_andamento','encerrado','cancelado') DEFAULT 'planejamento' NOT NULL;--> statement-breakpoint
ALTER TABLE `encounter_events` ADD `responsiblePersonId` int;--> statement-breakpoint
ALTER TABLE `encounter_events` ADD `generalNotes` text;--> statement-breakpoint
ALTER TABLE `encounter_events` ADD `updatedAt` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `encounter_enrollments` ADD CONSTRAINT `encounter_enrollments_event_person_unique` UNIQUE(`churchId`,`encounterEventId`,`personId`);--> statement-breakpoint
CREATE INDEX `encounter_checklist_event_status_idx` ON `encounter_checklist_items` (`churchId`,`encounterEventId`,`status`);--> statement-breakpoint
CREATE INDEX `encounter_checklist_assignee_idx` ON `encounter_checklist_items` (`churchId`,`assignedPersonId`,`dueAt`);--> statement-breakpoint
CREATE INDEX `encounter_disciple_forms_event_review_idx` ON `encounter_disciple_forms` (`churchId`,`encounterEventId`,`reviewStatus`);--> statement-breakpoint
CREATE INDEX `encounter_history_event_created_idx` ON `encounter_history` (`churchId`,`encounterEventId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `encounter_public_forms_event_active_idx` ON `encounter_public_forms` (`churchId`,`encounterEventId`,`active`);--> statement-breakpoint
CREATE INDEX `encounter_servants_event_person_idx` ON `encounter_servant_assignments` (`churchId`,`encounterEventId`,`personId`);--> statement-breakpoint
CREATE INDEX `encounter_servants_event_team_idx` ON `encounter_servant_assignments` (`churchId`,`encounterEventId`,`teamId`,`active`);--> statement-breakpoint
CREATE INDEX `encounter_teams_parent_idx` ON `encounter_teams` (`churchId`,`encounterEventId`,`parentTeamId`);--> statement-breakpoint
CREATE INDEX `encounter_enrollments_event_status_idx` ON `encounter_enrollments` (`churchId`,`encounterEventId`,`status`);--> statement-breakpoint
CREATE INDEX `encounter_events_church_status_idx` ON `encounter_events` (`churchId`,`status`);--> statement-breakpoint
CREATE INDEX `encounter_events_responsible_idx` ON `encounter_events` (`churchId`,`responsiblePersonId`);