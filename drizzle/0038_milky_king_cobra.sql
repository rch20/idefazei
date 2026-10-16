ALTER TABLE `media_assets` MODIFY COLUMN `purpose` enum('tenant_logo','tenant_pwa_icon','tenant_public_gallery','certificate_logo','treasury_attachment','public_video','announcement_image','other') NOT NULL DEFAULT 'other';--> statement-breakpoint
ALTER TABLE `announcements` ADD `publicVisible` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `announcements` ADD `publicStatus` enum('rascunho','publicado','agendado','arquivado') DEFAULT 'rascunho' NOT NULL;--> statement-breakpoint
ALTER TABLE `announcements` ADD `publicStartsAt` timestamp;--> statement-breakpoint
ALTER TABLE `announcements` ADD `ctaLabel` varchar(80);--> statement-breakpoint
ALTER TABLE `announcements` ADD `ctaHref` varchar(500);--> statement-breakpoint
ALTER TABLE `announcements` ADD `mediaAssetId` int;