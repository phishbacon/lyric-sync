CREATE TABLE `lyric_settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`base_url` text NOT NULL,
	`prefer_synced` integer NOT NULL,
	`enabled_sources` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
