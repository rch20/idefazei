-- Segurança: contadores de tentativas que sobrevivem a reinício do servidor e recuperação de senha do Super Admin por link.
CREATE TABLE IF NOT EXISTS `rate_limit_hits` (
  `id` bigint AUTO_INCREMENT NOT NULL,
  `bucket` varchar(48) NOT NULL,
  `keyHash` char(40) NOT NULL,
  `createdAt` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT `rate_limit_hits_id` PRIMARY KEY(`id`),
  KEY `rate_limit_hits_lookup_idx` (`bucket`, `keyHash`, `createdAt`),
  KEY `rate_limit_hits_created_idx` (`createdAt`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `super_admin_password_resets` (
  `id` int AUTO_INCREMENT NOT NULL,
  `superAdminId` int NOT NULL,
  `tokenHash` varchar(64) NOT NULL,
  `expiresAt` timestamp NOT NULL,
  `usedAt` timestamp NULL,
  `requestIp` varchar(64) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `super_admin_password_resets_id` PRIMARY KEY(`id`),
  UNIQUE KEY `super_admin_password_resets_token_unique` (`tokenHash`),
  KEY `super_admin_password_resets_admin_idx` (`superAdminId`, `createdAt`)
);
