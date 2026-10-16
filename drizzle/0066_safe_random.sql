CREATE TABLE `web_push_subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`churchUserId` int NOT NULL,
	`endpoint` text NOT NULL,
	`endpointHash` varchar(64) NOT NULL,
	`p256dh` varchar(255) NOT NULL,
	`auth` varchar(255) NOT NULL,
	`userAgent` varchar(512),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`lastSeenAt` timestamp NOT NULL DEFAULT (now()),
	`revokedAt` timestamp,
	CONSTRAINT `web_push_subscriptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `web_push_subscriptions_endpointHash_unique` UNIQUE(`endpointHash`)
);
--> statement-breakpoint
CREATE INDEX `web_push_subscriptions_church_user_idx` ON `web_push_subscriptions` (`churchId`,`churchUserId`);--> statement-breakpoint
CREATE INDEX `web_push_subscriptions_church_active_idx` ON `web_push_subscriptions` (`churchId`,`revokedAt`);