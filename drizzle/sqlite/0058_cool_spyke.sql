CREATE TABLE `portal_cluster_keywords` (
	`id` text PRIMARY KEY NOT NULL,
	`cluster_id` text NOT NULL,
	`keyword` text NOT NULL,
	`monthly_volume` integer,
	`start_position` integer,
	`current_position` integer,
	`sort_order` integer NOT NULL,
	FOREIGN KEY (`cluster_id`) REFERENCES `portal_clusters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `portal_cluster_keywords_cluster_idx` ON `portal_cluster_keywords` (`cluster_id`);--> statement-breakpoint
CREATE TABLE `portal_clusters` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`sort_order` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `portal_clusters_project_idx` ON `portal_clusters` (`project_id`);--> statement-breakpoint
CREATE TABLE `portal_milestones` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`month` integer NOT NULL,
	`title` text NOT NULL,
	`detail` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'todo' NOT NULL,
	`sort_order` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `portal_milestones_project_idx` ON `portal_milestones` (`project_id`);--> statement-breakpoint
CREATE TABLE `portal_strategies` (
	`project_id` text PRIMARY KEY NOT NULL,
	`start_date` text NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `portal_wins` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`title` text NOT NULL,
	`detail` text DEFAULT '' NOT NULL,
	`won_on` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `portal_wins_project_idx` ON `portal_wins` (`project_id`);