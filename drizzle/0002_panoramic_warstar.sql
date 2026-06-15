CREATE TABLE `church_registrations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`status` enum('pending','approved','rejected','suspended') NOT NULL DEFAULT 'pending',
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`rejectionReason` text,
	`suspensionReason` text,
	`submittedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `church_registrations_id` PRIMARY KEY(`id`),
	CONSTRAINT `church_registrations_churchId_unique` UNIQUE(`churchId`)
);
--> statement-breakpoint
CREATE TABLE `church_users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`passwordHash` varchar(255) NOT NULL,
	`role` enum('pastor_presidente','pastor_local','supervisor','lider','consolidador','diacono','secretario','tesoureiro','membro') NOT NULL DEFAULT 'membro',
	`personId` int,
	`active` boolean NOT NULL DEFAULT true,
	`lastLoginAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `church_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `church_users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`slug` varchar(50) NOT NULL,
	`description` text,
	`priceMonthly` decimal(10,2),
	`priceYearly` decimal(10,2),
	`maxMembers` int,
	`maxCells` int,
	`features` json,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `plans_id` PRIMARY KEY(`id`),
	CONSTRAINT `plans_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`planId` int NOT NULL,
	`status` enum('trial','active','suspended','cancelled','pending') NOT NULL DEFAULT 'pending',
	`trialEndsAt` timestamp,
	`currentPeriodStart` timestamp,
	`currentPeriodEnd` timestamp,
	`cancelledAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `subscriptions_churchId_unique` UNIQUE(`churchId`)
);
--> statement-breakpoint
CREATE TABLE `super_admins` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`passwordHash` varchar(255) NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `super_admins_id` PRIMARY KEY(`id`),
	CONSTRAINT `super_admins_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `visitor_leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`phone` varchar(20),
	`email` varchar(320),
	`type` enum('pedido_oracao','visita_pastoral','primeira_visita','interesse_participar') NOT NULL,
	`message` text,
	`status` enum('novo','em_contato','convertido','encerrado') NOT NULL DEFAULT 'novo',
	`assignedTo` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `visitor_leads_id` PRIMARY KEY(`id`)
);
