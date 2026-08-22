CREATE TABLE `tenant_page_revisions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`siteId` int NOT NULL,
	`version` int NOT NULL,
	`snapshot` json NOT NULL,
	`createdByChurchUserId` int,
	`publishedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tenant_page_revisions_id` PRIMARY KEY(`id`),
	CONSTRAINT `tenant_page_revisions_site_version_unique` UNIQUE(`siteId`,`version`)
);
--> statement-breakpoint
CREATE TABLE `tenant_page_sections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`siteId` int NOT NULL,
	`sectionType` enum('hero','welcome','about','schedule','events','contact','footer') NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`content` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenant_page_sections_id` PRIMARY KEY(`id`),
	CONSTRAINT `tenant_page_sections_site_type_unique` UNIQUE(`siteId`,`sectionType`)
);
--> statement-breakpoint
CREATE TABLE `tenant_public_sites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`templateKey` varchar(80) NOT NULL DEFAULT 'ministerial_base',
	`status` enum('draft','published') NOT NULL DEFAULT 'draft',
	`publishedRevisionId` int,
	`seoTitle` varchar(255),
	`seoDescription` varchar(320),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenant_public_sites_id` PRIMARY KEY(`id`),
	CONSTRAINT `tenant_public_sites_church_unique` UNIQUE(`churchId`)
);
--> statement-breakpoint
CREATE TABLE `tenant_themes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`primaryColor` varchar(7) NOT NULL DEFAULT '#1e3a5f',
	`secondaryColor` varchar(7) NOT NULL DEFAULT '#c9a84c',
	`accentColor` varchar(7),
	`fontPair` varchar(80) NOT NULL DEFAULT 'sacred_serif',
	`logoUrl` text,
	`faviconUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenant_themes_id` PRIMARY KEY(`id`),
	CONSTRAINT `tenant_themes_church_unique` UNIQUE(`churchId`)
);
--> statement-breakpoint
CREATE INDEX `tenant_page_revisions_church_site_idx` ON `tenant_page_revisions` (`churchId`,`siteId`);--> statement-breakpoint
CREATE INDEX `tenant_page_sections_church_site_idx` ON `tenant_page_sections` (`churchId`,`siteId`);