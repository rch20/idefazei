-- Ficha: declaração do próprio membro de que já é batizado (ex.: outra igreja). Não é o registro oficial.
ALTER TABLE `people` ADD COLUMN `declaredBaptized` boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE `people` ADD COLUMN `declaredBaptismDate` date NULL;
