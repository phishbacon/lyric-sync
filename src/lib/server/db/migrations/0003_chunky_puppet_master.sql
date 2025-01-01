CREATE TABLE `tracks` (
	`title` text NOT NULL,
	`uuid` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`path` text NOT NULL,
	`duration` integer NOT NULL,
	`synced` integer DEFAULT false NOT NULL,
	`library` text NOT NULL,
	`artist` text NOT NULL,
	`album` text NOT NULL,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`library`) REFERENCES `libaries`(`uuid`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`artist`) REFERENCES `artists`(`uuid`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`album`) REFERENCES `albums`(`uuid`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tracks_key_unique` ON `tracks` (`key`);