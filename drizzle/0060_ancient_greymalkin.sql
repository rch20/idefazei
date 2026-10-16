CREATE TABLE `church_password_reset_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`churchUserId` int NOT NULL,
	`tokenHash` varchar(64) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`usedAt` timestamp,
	`requestIp` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `church_password_reset_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `church_password_reset_tokens_tokenHash_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
CREATE INDEX `church_password_reset_tokens_user_created_idx` ON `church_password_reset_tokens` (`churchUserId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `church_password_reset_tokens_expires_idx` ON `church_password_reset_tokens` (`expiresAt`);