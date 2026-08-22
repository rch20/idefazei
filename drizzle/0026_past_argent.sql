CREATE TABLE `super_admin_bootstrap` (
	`id` int NOT NULL,
	`configuredAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `super_admin_bootstrap_id` PRIMARY KEY(`id`)
);
