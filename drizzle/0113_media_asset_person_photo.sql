-- Amplia o enum de finalidade de mídia para aceitar a foto de perfil (person_photo).
ALTER TABLE `media_assets` MODIFY COLUMN `purpose` enum('tenant_logo','tenant_pwa_icon','tenant_public_gallery','tenant_public_hero','certificate_logo','treasury_attachment','public_video','announcement_image','event_flyer','cell_study_attachment','person_photo','other') NOT NULL DEFAULT 'other';
