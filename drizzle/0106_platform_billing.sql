-- Cobrança da plataforma (Pagar.me): vigência paga da igreja e registro das cobranças. O teste grátis é calculado pela data de criação, sem gravar nada.
ALTER TABLE `churches` ADD COLUMN `paidUntil` datetime NULL, ADD COLUMN `billingPlan` varchar(16) NULL, ADD COLUMN `pagarmeSubscriptionId` varchar(64) NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `platform_payments` (
  `id` int AUTO_INCREMENT NOT NULL,
  `churchId` int NOT NULL,
  `mode` enum('pontual','recorrente','manual') NOT NULL,
  `planKey` varchar(16) NOT NULL,
  `cycle` enum('mensal','anual') NOT NULL,
  `amountCents` int NOT NULL,
  `status` enum('pendente','pago','falhou','cancelado') NOT NULL DEFAULT 'pendente',
  `pagarmeLinkId` varchar(64) NULL,
  `pagarmeLinkUrl` varchar(512) NULL,
  `pagarmeChargeId` varchar(64) NULL,
  `paymentMethod` varchar(32) NULL,
  `paidAt` datetime NULL,
  `periodEnd` datetime NULL,
  `note` varchar(255) NULL,
  `createdBy` varchar(160) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `platform_payments_id` PRIMARY KEY(`id`),
  UNIQUE KEY `platform_payments_charge_unique` (`pagarmeChargeId`),
  KEY `platform_payments_church_idx` (`churchId`, `createdAt`)
);
