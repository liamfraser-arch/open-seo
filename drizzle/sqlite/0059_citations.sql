CREATE TABLE `citation_checks` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`business_name` text NOT NULL,
	`city` text,
	`location_code` integer NOT NULL,
	`language_code` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `citation_checks_project_idx` ON `citation_checks` (`project_id`);--> statement-breakpoint
CREATE TABLE `citation_listings` (
	`id` text PRIMARY KEY NOT NULL,
	`result_id` text NOT NULL,
	`url` text NOT NULL,
	`title` text,
	FOREIGN KEY (`result_id`) REFERENCES `citation_results`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `citation_listings_result_idx` ON `citation_listings` (`result_id`);--> statement-breakpoint
CREATE TABLE `citation_results` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`directory` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `citation_runs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `citation_results_run_directory_idx` ON `citation_results` (`run_id`,`directory`);--> statement-breakpoint
CREATE TABLE `citation_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`check_id` text NOT NULL,
	`project_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`error_message` text,
	`started_at` text NOT NULL,
	`completed_at` text,
	FOREIGN KEY (`check_id`) REFERENCES `citation_checks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `citation_runs_check_idx` ON `citation_runs` (`check_id`,`started_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `citation_runs_one_pending_per_check_idx` ON `citation_runs` (`check_id`) WHERE "citation_runs"."status" = 'pending';