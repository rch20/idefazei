CREATE TABLE `leadership_school_attendance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`lessonId` int NOT NULL,
	`enrollmentId` int NOT NULL,
	`status` enum('presente','ausente','justificado') NOT NULL,
	`note` varchar(500),
	`recordedByChurchUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leadership_school_attendance_id` PRIMARY KEY(`id`),
	CONSTRAINT `leadership_school_attendance_unique` UNIQUE(`churchId`,`lessonId`,`enrollmentId`)
);
--> statement-breakpoint
CREATE TABLE `leadership_school_lessons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`classId` int NOT NULL,
	`title` varchar(160) NOT NULL,
	`summary` varchar(500),
	`content` text,
	`lessonDate` date,
	`position` int NOT NULL DEFAULT 0,
	`status` enum('rascunho','publicada','concluida') NOT NULL DEFAULT 'rascunho',
	`createdByChurchUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leadership_school_lessons_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leadership_school_progress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`enrollmentId` int NOT NULL,
	`lessonId` int NOT NULL,
	`status` enum('nao_iniciada','em_andamento','concluida') NOT NULL DEFAULT 'nao_iniciada',
	`reflection` text,
	`reviewStatus` enum('pendente','compreendeu','precisa_reforco','nao_participou') NOT NULL DEFAULT 'pendente',
	`reviewNotes` text,
	`reviewedAt` timestamp,
	`reviewedByChurchUserId` int,
	`releasedAt` timestamp,
	`releasedByChurchUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leadership_school_progress_id` PRIMARY KEY(`id`),
	CONSTRAINT `leadership_school_progress_unique` UNIQUE(`churchId`,`enrollmentId`,`lessonId`)
);
--> statement-breakpoint
CREATE TABLE `leadership_school_teachers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`classId` int NOT NULL,
	`churchUserId` int NOT NULL,
	`assignedByChurchUserId` int NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `leadership_school_teachers_id` PRIMARY KEY(`id`),
	CONSTRAINT `leadership_school_teachers_unique` UNIQUE(`churchId`,`classId`,`churchUserId`)
);
--> statement-breakpoint
CREATE INDEX `leadership_school_attendance_church_lesson_idx` ON `leadership_school_attendance` (`churchId`,`lessonId`);--> statement-breakpoint
CREATE INDEX `leadership_school_lessons_church_class_position_idx` ON `leadership_school_lessons` (`churchId`,`classId`,`position`);--> statement-breakpoint
CREATE INDEX `leadership_school_progress_church_enrollment_idx` ON `leadership_school_progress` (`churchId`,`enrollmentId`);--> statement-breakpoint
CREATE INDEX `leadership_school_progress_church_lesson_idx` ON `leadership_school_progress` (`churchId`,`lessonId`);--> statement-breakpoint
CREATE INDEX `leadership_school_teachers_church_class_idx` ON `leadership_school_teachers` (`churchId`,`classId`);