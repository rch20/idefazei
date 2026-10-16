ALTER TABLE `event_registrations` ADD `amountCents` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `event_registrations` ADD `paymentStatus` enum('pendente','pago','isento','reembolsado') DEFAULT 'pendente' NOT NULL;--> statement-breakpoint
ALTER TABLE `event_registrations` ADD `paymentConfirmedAt` timestamp;--> statement-breakpoint
ALTER TABLE `event_registrations` ADD `paymentConfirmedByChurchUserId` int;--> statement-breakpoint
ALTER TABLE `events` ADD `registrationFeeCents` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `paymentDueDate` date;--> statement-breakpoint
ALTER TABLE `events` ADD `paymentInstructions` text;