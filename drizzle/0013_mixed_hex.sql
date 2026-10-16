CREATE TABLE `consolidation_follow_ups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`churchId` int NOT NULL,
	`referralId` int NOT NULL,
	`recordedByPersonId` int NOT NULL,
	`contactChannel` enum('whatsapp','ligacao','mensagem','visita','presencial','outro') NOT NULL,
	`outcome` enum('conversou','sem_resposta','retornar','agendou_visita','visitou','recusou_contato','outro') NOT NULL,
	`notes` text NOT NULL,
	`nextAction` varchar(255),
	`nextActionAt` timestamp,
	`visitStatus` enum('nao_necessaria','solicitada','agendada','realizada','cancelada') NOT NULL DEFAULT 'nao_necessaria',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `consolidation_follow_ups_id` PRIMARY KEY(`id`)
);
