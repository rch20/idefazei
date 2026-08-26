ALTER TABLE `media_assets` MODIFY COLUMN `purpose` enum('tenant_logo','tenant_pwa_icon','tenant_public_gallery','certificate_logo','treasury_attachment','public_video','other') NOT NULL DEFAULT 'other';--> statement-breakpoint
ALTER TABLE `churches` ADD `pwaIconAssetId` int;--> statement-breakpoint
ALTER TABLE `churches` ADD `pwaIcon192Url` text;--> statement-breakpoint
ALTER TABLE `churches` ADD `pwaIcon512Url` text;