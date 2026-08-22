CREATE TABLE `foundation_study_materials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`studyId` int NOT NULL,
	`libraryItemId` int NOT NULL,
	`position` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `foundation_study_materials_id` PRIMARY KEY(`id`),
	CONSTRAINT `foundation_study_materials_study_library_unique` UNIQUE(`churchId`,`studyId`,`libraryItemId`)
);
--> statement-breakpoint
CREATE INDEX `foundation_study_materials_church_study_position_idx` ON `foundation_study_materials` (`churchId`,`studyId`,`position`);