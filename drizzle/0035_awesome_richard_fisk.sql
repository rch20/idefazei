CREATE TABLE `care_visit_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`visitId` int NOT NULL,
	`action` enum('criada','atribuida','reatribuida','agendada','reagendada','iniciada','concluida','cancelada') NOT NULL,
	`fromPersonId` int,
	`toPersonId` int,
	`performedByChurchUserId` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `care_visit_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `care_visits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`referralId` int NOT NULL,
	`departmentId` int,
	`requestedByPersonId` int NOT NULL,
	`assignedToPersonId` int,
	`assignedByChurchUserId` int,
	`priority` enum('baixa','normal','alta','urgente') NOT NULL DEFAULT 'normal',
	`status` enum('solicitada','agendada','em_andamento','realizada','cancelada') NOT NULL DEFAULT 'solicitada',
	`reason` varchar(255) NOT NULL,
	`address` text,
	`scheduledAt` timestamp,
	`assignedAt` timestamp,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`cancelledAt` timestamp,
	`completionNotes` text,
	`cancellationReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `care_visits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `consolidation_case_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`referralId` int NOT NULL,
	`action` enum('atribuido','reatribuido','aceito','devolvido_fila') NOT NULL,
	`fromPersonId` int,
	`toPersonId` int,
	`performedByChurchUserId` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `consolidation_case_assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `ministries` MODIFY COLUMN `type` enum('louvor','infantil','recepcao','midia','intercessao','evangelismo','casais','jovens','consolidacao','outro') NOT NULL;--> statement-breakpoint
ALTER TABLE `consolidation_referrals` ADD `assignedToPersonId` int;--> statement-breakpoint
ALTER TABLE `consolidation_referrals` ADD `assignedByChurchUserId` int;--> statement-breakpoint
ALTER TABLE `consolidation_referrals` ADD `assignedAt` timestamp;--> statement-breakpoint
ALTER TABLE `consolidation_referrals` ADD `departmentId` int;--> statement-breakpoint
ALTER TABLE `consolidation_referrals` ADD `sourceType` enum('pastoral','celula','ministerio','departamento') DEFAULT 'pastoral' NOT NULL;--> statement-breakpoint
ALTER TABLE `consolidation_referrals` ADD `sourceCellId` int;--> statement-breakpoint
ALTER TABLE `consolidation_referrals` ADD `sourceMinistryId` int;--> statement-breakpoint
ALTER TABLE `consolidation_referrals` ADD `sourceDepartmentId` int;--> statement-breakpoint
ALTER TABLE `consolidation_referrals` ADD `priority` enum('baixa','normal','alta','urgente') DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE `departments` ADD `systemKey` enum('consolidacao','visitas');--> statement-breakpoint
ALTER TABLE `departments` ADD `supervisorId` int;--> statement-breakpoint
ALTER TABLE `departments` ADD CONSTRAINT `department_ministry_system_key_idx` UNIQUE(`ministryId`,`systemKey`);--> statement-breakpoint
CREATE INDEX `care_visit_event_visit_idx` ON `care_visit_events` (`churchId`,`visitId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `care_visit_queue_idx` ON `care_visits` (`churchId`,`status`,`scheduledAt`);--> statement-breakpoint
CREATE INDEX `care_visit_assignee_idx` ON `care_visits` (`churchId`,`assignedToPersonId`,`status`);--> statement-breakpoint
CREATE INDEX `care_visit_referral_idx` ON `care_visits` (`churchId`,`referralId`);--> statement-breakpoint
CREATE INDEX `care_visit_department_idx` ON `care_visits` (`churchId`,`departmentId`,`status`);--> statement-breakpoint
CREATE INDEX `consolidation_case_assignment_referral_idx` ON `consolidation_case_assignments` (`churchId`,`referralId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `consolidation_referral_queue_idx` ON `consolidation_referrals` (`churchId`,`status`,`careDueAt`);--> statement-breakpoint
CREATE INDEX `consolidation_referral_assignee_idx` ON `consolidation_referrals` (`churchId`,`assignedToPersonId`,`status`);--> statement-breakpoint
CREATE INDEX `consolidation_referral_department_idx` ON `consolidation_referrals` (`churchId`,`departmentId`,`status`);--> statement-breakpoint
CREATE INDEX `consolidation_referral_person_idx` ON `consolidation_referrals` (`churchId`,`personId`,`status`);--> statement-breakpoint
CREATE INDEX `department_church_supervisor_idx` ON `departments` (`churchId`,`supervisorId`);