PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_tracks` (
	`key` text PRIMARY KEY NOT NULL,
	`uuid` text NOT NULL,
	`title` text NOT NULL,
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
INSERT INTO `__new_tracks`("key", "uuid", "title", "path", "duration", "track_number", "synced", "sync_status", "library_uuid", "artist_uuid", "album_uuid", "created_at", "updated_at") SELECT "key", "uuid", "title", "path", "duration", "track_number", "synced", "sync_status", "library_uuid", "artist_uuid", "album_uuid", "created_at", "updated_at" FROM `tracks`;--> statement-breakpoint
DROP TABLE `tracks`;--> statement-breakpoint
ALTER TABLE `__new_tracks` RENAME TO `tracks`;--> statement-breakpoint
PRAGMA foreign_keys=ON;