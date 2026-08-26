ALTER TABLE `cells` ADD `publicVisible` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `cells` ADD `publicLocationMode` enum('approximate','exact') DEFAULT 'approximate' NOT NULL;--> statement-breakpoint
ALTER TABLE `cells` ADD `publicLeaderContact` boolean DEFAULT false NOT NULL;