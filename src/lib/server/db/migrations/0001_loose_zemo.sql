CREATE TABLE `artists` (
	`title` text NOT NULL,
	`uuid` text PRIMARY KEY NOT NULL,
	`image` text NOT NULL,
	`key` text NOT NULL,
	`synced` integer DEFAULT false NOT NULL,
	`library` text NOT NULL,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`library`) REFERENCES `libaries`(`uuid`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `artists_key_unique` ON `artists` (`key`);