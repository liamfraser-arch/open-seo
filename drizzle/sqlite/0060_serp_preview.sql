CREATE TABLE `rank_snapshot_results` (
	`run_id` text NOT NULL,
	`tracking_keyword_id` text NOT NULL,
	`device` text NOT NULL,
	`position` integer NOT NULL,
	`url` text NOT NULL,
	`domain` text,
	`title` text,
	PRIMARY KEY(`run_id`, `tracking_keyword_id`, `device`, `position`),
	FOREIGN KEY (`run_id`) REFERENCES `rank_check_runs`(`id`) ON UPDATE no action ON DELETE cascade
);
