ALTER TABLE `church_users` ADD `registrationStatus` enum('approved','pending','rejected') DEFAULT 'approved' NOT NULL;--> statement-breakpoint
ALTER TABLE `church_users` ADD `approvedAt` timestamp;--> statement-breakpoint
ALTER TABLE `church_users` ADD `approvedByChurchUserId` int;--> statement-breakpoint
ALTER TABLE `church_users` ADD `rejectionReason` text;