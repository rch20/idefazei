CREATE TABLE `church_user_complementary_roles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`churchUserId` int NOT NULL,
	`churchUserComplementaryRole` enum('consolidador','diacono','tesoureiro','levita') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `church_user_complementary_roles_id` PRIMARY KEY(`id`)
);
