CREATE TABLE `libaries` (
	`title` text NOT NULL,
	`uuid` text PRIMARY KEY NOT NULL,
	`image` text NOT NULL,
	`path` text NOT NULL,
	`key` text NOT NULL,
	`current_library` integer DEFAULT false NOT NULL,
	`server_name` text NOT NULL,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`server_name`) REFERENCES `servers`(`server_name`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `libaries_key_unique` ON `libaries` (`key`);--> statement-breakpoint
CREATE TABLE `servers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`server_name` text NOT NULL,
	`hostname` text NOT NULL,
	`port` integer NOT NULL,
	`x_plex_token` text NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `servers_serverName_unique` ON `servers` (`server_name`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`password` text NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);