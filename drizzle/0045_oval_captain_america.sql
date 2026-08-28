ALTER TABLE `consolidation_case_assignments` MODIFY COLUMN `action` enum('atribuido','reatribuido','aprovado','aceito','devolvido_fila') NOT NULL;--> statement-breakpoint
ALTER TABLE `consolidation_referrals` MODIFY COLUMN `status` enum('pendente','aprovado','aceito','em_acompanhamento','encerrado','cancelado') NOT NULL DEFAULT 'pendente';--> statement-breakpoint
ALTER TABLE `consolidation_referrals` ADD `approvedByPersonId` int;--> statement-breakpoint
ALTER TABLE `consolidation_referrals` ADD `approvedAt` timestamp;