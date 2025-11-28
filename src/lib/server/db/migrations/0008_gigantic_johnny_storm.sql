CREATE TABLE `settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`library` text NOT NULL,
	`plex_library_sync_interval` integer DEFAULT 0,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`library`) REFERENCES `libraries`(`uuid`) ON UPDATE no action ON DELETE no action
);