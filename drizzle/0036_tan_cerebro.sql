CREATE TABLE `media_assets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`provider` enum('cloudinary','manus_storage') NOT NULL,
	`resourceType` enum('image','video','raw') NOT NULL DEFAULT 'image',
	`purpose` enum('tenant_logo','tenant_public_gallery','certificate_logo','treasury_attachment','public_video','other') NOT NULL DEFAULT 'other',
	`publicId` varchar(512),
	`storageKey` varchar(512),
	`url` text NOT NULL,
	`secureUrl` text,
	`originalFilename` varchar(255),
	`mimeType` varchar(100) NOT NULL,
	`bytes` int NOT NULL DEFAULT 0,
	`width` int,
	`height` int,
	`durationSeconds` int,
	`entityType` varchar(80),
	`entityId` int,
	`uploadedByChurchUserId` int,
	`status` enum('active','deleted') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `media_assets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `media_assets_church_idx` ON `media_assets` (`churchId`);--> statement-breakpoint
CREATE INDEX `media_assets_church_purpose_idx` ON `media_assets` (`churchId`,`purpose`);--> statement-breakpoint
CREATE INDEX `media_assets_provider_public_id_idx` ON `media_assets` (`provider`,`publicId`);