ALTER TABLE `discipleship_stage_progress`
  ADD COLUMN `isCurrent` boolean NOT NULL DEFAULT false AFTER `status`;

CREATE INDEX `discipleship_stage_progress_current_idx`
  ON `discipleship_stage_progress` (`churchId`, `personId`, `isCurrent`);
