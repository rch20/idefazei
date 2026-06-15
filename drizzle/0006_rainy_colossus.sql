ALTER TABLE `churches` ADD `stripeCustomerId` varchar(255);--> statement-breakpoint
ALTER TABLE `churches` ADD `stripeSubscriptionId` varchar(255);--> statement-breakpoint
ALTER TABLE `churches` ADD `stripePlan` enum('basic','pro','enterprise');--> statement-breakpoint
ALTER TABLE `churches` ADD `stripeStatus` varchar(50);--> statement-breakpoint
ALTER TABLE `churches` ADD `stripeCurrentPeriodEnd` timestamp;--> statement-breakpoint
ALTER TABLE `churches` ADD `trialEndsAt` timestamp;