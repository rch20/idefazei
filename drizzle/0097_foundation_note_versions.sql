-- 0097: controle otimista de versão das anotações da Escola de Fundamentos.
-- Migration customizada ADITIVA; somente preparar/revisar neste checkout local.
-- Não regrava notas, progresso, status, createdAt ou updatedAt existentes.
-- A versão zero representa linhas legadas; só uma alteração normalizada incrementa a versão.
-- Aplicar apenas após preflight/backup e autorização específica; não executar por db:push.
-- MySQL 8: a repetição segura é controlada por schema/checksum no executor seletivo.
ALTER TABLE `foundation_lesson_progress`
  ADD COLUMN `reflectionVersion` INT NOT NULL DEFAULT 0 AFTER `reflection`;

ALTER TABLE `foundation_block_progress`
  ADD COLUMN `reflectionVersion` INT NOT NULL DEFAULT 0 AFTER `reflection`;
