CREATE TABLE `prospect_searches` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`keyword` text NOT NULL,
	`location_name` text NOT NULL,
	`location_code` integer NOT NULL,
	`language_code` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `prospect_searches_organization_idx` ON `prospect_searches` (`organization_id`);--> statement-breakpoint
CREATE TABLE `prospects` (
	`id` text PRIMARY KEY NOT NULL,
	`search_id` text NOT NULL,
	`organization_id` text NOT NULL,
	`rank` integer NOT NULL,
	`title` text NOT NULL,
	`place_id` text,
	`cid` text,
	`url` text,
	`domain` text,
	`phone` text,
	`address` text,
	`city` text,
	`category` text,
	`rating` real,
	`reviews_count` integer,
	`photos_count` integer,
	`is_claimed` integer,
	`score` integer NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	FOREIGN KEY (`search_id`) REFERENCES `prospect_searches`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `prospects_search_score_idx` ON `prospects` (`search_id`,`score`);--> statement-breakpoint
CREATE INDEX `prospects_organization_idx` ON `prospects` (`organization_id`);