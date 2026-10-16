ALTER TABLE `event_registrations` MODIFY COLUMN `personId` int;--> statement-breakpoint
ALTER TABLE `event_registrations` ADD `churchId` int;--> statement-breakpoint
ALTER TABLE `event_registrations` ADD `participantName` varchar(255);--> statement-breakpoint
ALTER TABLE `event_registrations` ADD `participantPhone` varchar(20);--> statement-breakpoint
ALTER TABLE `event_registrations` ADD `companionName` varchar(255);--> statement-breakpoint
ALTER TABLE `event_registrations` ADD `email` varchar(320);--> statement-breakpoint
ALTER TABLE `event_registrations` ADD `attendeeCount` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `event_registrations` ADD `source` enum('manual','public_form') DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE `event_registrations` ADD `presenceStatus` enum('pendente','presente','ausente','cancelado') DEFAULT 'pendente' NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `registrationMode` enum('none','individual','casal') DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `registrationToken` varchar(96);--> statement-breakpoint
ALTER TABLE `events` ADD CONSTRAINT `events_registration_token_unique` UNIQUE(`registrationToken`);--> statement-breakpoint
CREATE INDEX `event_registrations_event_status_idx` ON `event_registrations` (`eventId`,`presenceStatus`);--> statement-breakpoint
CREATE INDEX `event_registrations_church_idx` ON `event_registrations` (`churchId`,`eventId`);--> statement-breakpoint
CREATE INDEX `events_church_date_idx` ON `events` (`churchId`,`startDate`);--> statement-breakpoint
