CREATE TABLE `libaries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`uuid` text NOT NULL,
	`path` text NOT NULL,
	`current_library` integer DEFAULT false NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
