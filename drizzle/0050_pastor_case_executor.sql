ALTER TABLE `consolidation_referrals` ADD `acceptedByChurchUserId` int;
ALTER TABLE `consolidation_follow_ups` MODIFY COLUMN `recordedByPersonId` int;
ALTER TABLE `consolidation_follow_ups` ADD `recordedByChurchUserId` int;
ALTER TABLE `care_visits` MODIFY COLUMN `requestedByPersonId` int;
ALTER TABLE `care_visits` ADD `requestedByChurchUserId` int;

