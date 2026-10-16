CREATE TABLE `baptism_classes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`date` date NOT NULL,
	`location` varchar(255),
	`pastor` varchar(255),
	`notes` text,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `baptism_classes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `baptism_enrollments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`baptismClassId` int NOT NULL,
	`personId` int NOT NULL,
	`churchId` int NOT NULL,
	`status` enum('inscrito','participou','concluiu','cancelado') NOT NULL DEFAULT 'inscrito',
	`certificateUrl` text,
	`enrolledAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `baptism_enrollments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `communication_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`type` enum('push','email','whatsapp','sms') NOT NULL,
	`category` enum('boas_vindas','aniversario','lembrete_evento','lembrete_celula','convite','aviso','outro') NOT NULL,
	`recipientPersonId` int,
	`recipientName` varchar(255),
	`title` varchar(255),
	`message` text,
	`status` enum('enviado','entregue','falhou') NOT NULL DEFAULT 'enviado',
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `communication_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `counseling_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`churchId` int NOT NULL,
	`authorId` int NOT NULL,
	`content` text NOT NULL,
	`confidential` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `counseling_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `encounter_enrollments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`encounterEventId` int NOT NULL,
	`personId` int NOT NULL,
	`churchId` int NOT NULL,
	`status` enum('inscrito','confirmado','participou','concluiu','cancelado') NOT NULL DEFAULT 'inscrito',
	`enrolledAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `encounter_enrollments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `encounter_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`date` date NOT NULL,
	`endDate` date,
	`location` varchar(255),
	`maxParticipants` int,
	`description` text,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `encounter_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leadership_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`personId` int NOT NULL,
	`role` enum('pastor_presidente','pastor_local','supervisor','lider','consolidador','diacono','secretario','tesoureiro','membro') NOT NULL,
	`startDate` date NOT NULL,
	`endDate` date,
	`ministry` varchar(255),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `leadership_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leadership_school_classes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`period` varchar(100),
	`startDate` date,
	`endDate` date,
	`pastor` varchar(255),
	`description` text,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `leadership_school_classes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leadership_school_enrollments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`classId` int NOT NULL,
	`personId` int NOT NULL,
	`churchId` int NOT NULL,
	`status` enum('matriculado','lider_em_formacao','concluido','cancelado') NOT NULL DEFAULT 'matriculado',
	`grade` decimal(4,2),
	`attendance` int DEFAULT 0,
	`certificateUrl` text,
	`enrolledAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `leadership_school_enrollments_id` PRIMARY KEY(`id`)
);
