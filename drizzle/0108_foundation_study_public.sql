-- Fundamentos: estudo com leitura pública opcional (false = privado, comportamento anterior).
ALTER TABLE `foundation_studies` ADD COLUMN `isPublic` boolean NOT NULL DEFAULT false;
