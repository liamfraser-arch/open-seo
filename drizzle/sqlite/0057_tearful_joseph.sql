CREATE TABLE `portal_clients` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`email` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `portal_clients_project_email_uidx` ON `portal_clients` (`project_id`,`email`);--> statement-breakpoint
CREATE INDEX `portal_clients_email_idx` ON `portal_clients` (`email`);