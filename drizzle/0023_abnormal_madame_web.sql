ALTER TABLE `schedule_items` ADD `status` enum('agendada','cancelada') DEFAULT 'agendada' NOT NULL;--> statement-breakpoint
ALTER TABLE `schedule_items` ADD `cancelledAt` timestamp;--> statement-breakpoint
ALTER TABLE `schedule_items` ADD `cancelledByChurchUserId` int;--> statement-breakpoint
ALTER TABLE `schedule_items` ADD `cancelReason` varchar(500);