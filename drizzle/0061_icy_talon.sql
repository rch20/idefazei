CREATE TABLE `foundation_lesson_progress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`enrollmentId` int NOT NULL,
	`studyId` int NOT NULL,
	`status` enum('nao_iniciada','em_andamento','concluida') NOT NULL DEFAULT 'nao_iniciada',
	`lastBlockPosition` int NOT NULL DEFAULT 0,
	`startedAt` timestamp,
	`lastAccessedAt` timestamp,
	`completedAt` timestamp,
	`reflection` text,
	`reviewStatus` enum('pendente','compreendeu','precisa_reforco','nao_participou') NOT NULL DEFAULT 'pendente',
	`reviewNotes` text,
	`reviewedAt` timestamp,
	`reviewedByChurchUserId` int,
	`releasedAt` timestamp,
	`releasedByChurchUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `foundation_lesson_progress_id` PRIMARY KEY(`id`),
	CONSTRAINT `foundation_lesson_progress_enrollment_study_unique` UNIQUE(`churchId`,`enrollmentId`,`studyId`)
);
--> statement-breakpoint
CREATE INDEX `foundation_lesson_progress_church_enrollment_idx` ON `foundation_lesson_progress` (`churchId`,`enrollmentId`);--> statement-breakpoint
CREATE INDEX `foundation_lesson_progress_church_study_idx` ON `foundation_lesson_progress` (`churchId`,`studyId`);