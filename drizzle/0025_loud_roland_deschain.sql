CREATE TABLE `startup_diagnostics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int,
	`kind` enum('error','unhandled_rejection','resource_load','startup_timeout','recovery') NOT NULL,
	`message` varchar(500) NOT NULL,
	`fingerprint` varchar(96) NOT NULL,
	`path` varchar(255) NOT NULL,
	`userAgent` varchar(500) NOT NULL,
	`platform` varchar(120),
	`appVersion` varchar(80),
	`clientId` varchar(80),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `startup_diagnostics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `startup_diagnostics_created_idx` ON `startup_diagnostics` (`createdAt`);--> statement-breakpoint
CREATE INDEX `startup_diagnostics_church_created_idx` ON `startup_diagnostics` (`churchId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `startup_diagnostics_fingerprint_created_idx` ON `startup_diagnostics` (`fingerprint`,`createdAt`);