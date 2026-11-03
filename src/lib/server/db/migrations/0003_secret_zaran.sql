CREATE TABLE `task_batches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`scope` text NOT NULL,
	`target_uuid` text NOT NULL,
	`title` text NOT NULL,
	`dismissed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `jobs` ADD `batch_id` integer REFERENCES task_batches(id);--> statement-breakpoint
ALTER TABLE `jobs` ADD `dismissed_at` integer;