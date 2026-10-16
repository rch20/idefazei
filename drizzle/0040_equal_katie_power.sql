ALTER TABLE `churches` ADD `pwaIconSource` enum('custom','derived') DEFAULT 'derived' NOT NULL;
--> statement-breakpoint
UPDATE `churches` SET `pwaIconSource` = 'custom' WHERE `pwaIconAssetId` IS NOT NULL;
