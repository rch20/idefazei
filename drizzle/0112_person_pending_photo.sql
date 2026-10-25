-- Ficha: foto de perfil enviada pelo membro aguardando aprovação da liderança (moderação).
ALTER TABLE `people` ADD COLUMN `pendingPhotoUrl` text NULL;--> statement-breakpoint
ALTER TABLE `people` ADD COLUMN `pendingPhotoAt` timestamp NULL;--> statement-breakpoint
ALTER TABLE `people` ADD COLUMN `pendingPhotoAssetId` int NULL;
