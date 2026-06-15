ALTER TABLE `churches` ADD `certPastorName` varchar(255);--> statement-breakpoint
ALTER TABLE `churches` ADD `certLogoUrl` text;--> statement-breakpoint
ALTER TABLE `churches` ADD `certVerseFundamentos` text;--> statement-breakpoint
ALTER TABLE `churches` ADD `certVerseBatismo` text;--> statement-breakpoint
ALTER TABLE `churches` ADD `certVerseLideres` text;--> statement-breakpoint
ALTER TABLE `churches` ADD `certSignatureLabel` varchar(100) DEFAULT 'Pastor(a) Presidente';