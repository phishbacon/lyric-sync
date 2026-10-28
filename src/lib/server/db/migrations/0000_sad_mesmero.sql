CREATE TABLE `albums` (
	`uuid` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`image` text,
	`summary` text,
	`key` text NOT NULL,
	`synced` integer DEFAULT false NOT NULL,
	`library_uuid` text NOT NULL,
	`artist_uuid` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`library_uuid`) REFERENCES `libraries`(`uuid`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`artist_uuid`) REFERENCES `artists`(`uuid`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `albums_key_unique` ON `albums` (`key`);--> statement-breakpoint
CREATE TABLE `artists` (
	`uuid` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`image` text,
	`summary` text,
	`key` text NOT NULL,
	`library_uuid` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`library_uuid`) REFERENCES `libraries`(`uuid`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `artists_key_unique` ON `artists` (`key`);--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`target_uuid` text,
	`error` text,
	`started_at` integer,
	`finished_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `libraries` (
	`uuid` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`image` text,
	`path` text NOT NULL,
	`key` text NOT NULL,
	`active` integer DEFAULT false NOT NULL,
	`server_id` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`server_id`) REFERENCES `servers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `libraries_key_unique` ON `libraries` (`key`);--> statement-breakpoint
CREATE TABLE `servers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`base_url` text NOT NULL,
	`x_plex_token` text NOT NULL,
	`client_identifier` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tracks` (
	`uuid` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`key` text NOT NULL,
	`path` text,
	`duration` integer,
	`track_number` integer DEFAULT 0 NOT NULL,
	`synced` integer DEFAULT false NOT NULL,
	`sync_status` text DEFAULT 'pending' NOT NULL,
	`library_uuid` text NOT NULL,
	`artist_uuid` text NOT NULL,
	`album_uuid` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`library_uuid`) REFERENCES `libraries`(`uuid`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`artist_uuid`) REFERENCES `artists`(`uuid`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`album_uuid`) REFERENCES `albums`(`uuid`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tracks_key_unique` ON `tracks` (`key`);