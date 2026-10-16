CREATE TABLE `cell_studies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`weekStart` date NOT NULL,
	`biblicalText` varchar(500),
	`objective` text,
	`introduction` text,
	`development` text,
	`discussionQuestions` text,
	`practicalApplication` text,
	`prayer` text,
	`status` enum('rascunho','publicado','arquivado') NOT NULL DEFAULT 'rascunho',
	`publishedAt` timestamp,
	`createdByChurchUserId` int NOT NULL,
	`updatedByChurchUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cell_studies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cell_study_administrators` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`churchUserId` int NOT NULL,
	`assignedByChurchUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cell_study_administrators_id` PRIMARY KEY(`id`),
	CONSTRAINT `cell_study_admin_church_user_unique` UNIQUE(`churchId`,`churchUserId`)
);
--> statement-breakpoint
CREATE TABLE `cell_study_attachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`studyId` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`kind` enum('arquivo','link') NOT NULL,
	`mediaAssetId` int,
	`url` text,
	`mimeType` varchar(160),
	`originalFilename` varchar(255),
	`position` int NOT NULL DEFAULT 0,
	`createdByChurchUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cell_study_attachments_id` PRIMARY KEY(`id`),
	CONSTRAINT `cell_study_attachments_study_title_unique` UNIQUE(`churchId`,`studyId`,`title`)
);
--> statement-breakpoint
ALTER TABLE `media_assets` MODIFY COLUMN `purpose` enum('tenant_logo','tenant_pwa_icon','tenant_public_gallery','tenant_public_hero','certificate_logo','treasury_attachment','public_video','announcement_image','event_flyer','cell_study_attachment','other') NOT NULL DEFAULT 'other';--> statement-breakpoint
CREATE INDEX `cell_studies_church_week_idx` ON `cell_studies` (`churchId`,`weekStart`);--> statement-breakpoint
CREATE INDEX `cell_studies_church_status_idx` ON `cell_studies` (`churchId`,`status`);--> statement-breakpoint
CREATE INDEX `cell_study_admin_church_idx` ON `cell_study_administrators` (`churchId`);--> statement-breakpoint
CREATE INDEX `cell_study_attachments_church_study_position_idx` ON `cell_study_attachments` (`churchId`,`studyId`,`position`);