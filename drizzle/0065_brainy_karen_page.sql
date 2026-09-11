ALTER TABLE `ministries` ADD `iconKey` varchar(40) DEFAULT 'sparkles' NOT NULL;

UPDATE `ministries` SET `iconKey` = 'music' WHERE `type` = 'louvor';
UPDATE `ministries` SET `iconKey` = 'baby' WHERE `type` = 'infantil';
UPDATE `ministries` SET `iconKey` = 'users-round' WHERE `type` = 'recepcao';
UPDATE `ministries` SET `iconKey` = 'mic' WHERE `type` = 'midia';
UPDATE `ministries` SET `iconKey` = 'hands-praying' WHERE `type` = 'intercessao';
UPDATE `ministries` SET `iconKey` = 'megaphone' WHERE `type` = 'evangelismo';
UPDATE `ministries` SET `iconKey` = 'heart' WHERE `type` = 'casais';
UPDATE `ministries` SET `iconKey` = 'sparkles' WHERE `type` = 'jovens';
UPDATE `ministries` SET `iconKey` = 'heart-handshake' WHERE `type` = 'consolidacao';
UPDATE `ministries` SET `iconKey` = 'map-pin' WHERE `type` = 'visitas';
UPDATE `ministries` SET `iconKey` = 'utensils' WHERE LOWER(`name`) LIKE '%cozinha%';
UPDATE `ministries` SET `iconKey` = 'speaker' WHERE LOWER(`name`) LIKE '%áudio%' OR LOWER(`name`) LIKE '%audio%' OR LOWER(`name`) LIKE '%som%';
UPDATE `ministries` SET `iconKey` = 'message-circle' WHERE LOWER(`name`) LIKE '%comunica%';
UPDATE `ministries` SET `iconKey` = 'heart-handshake' WHERE LOWER(`name`) LIKE '%diacon%';
