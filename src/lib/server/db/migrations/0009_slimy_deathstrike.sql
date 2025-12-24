PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_libraries` (
	`title` text NOT NULL,
	`uuid` text PRIMARY KEY NOT NULL,
	`image` text,
	`path` text NOT NULL,
	`key` text NOT NULL,
	`current_library` integer DEFAULT false NOT NULL,
	`server_name` text NOT NULL,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`server_name`) REFERENCES `servers`(`server_name`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_libraries`("title", "uuid", "image", "path", "key", "current_library", "server_name", "created_at", "updated_at") SELECT "title", "uuid", "image", "path", "key", "current_library", "server_name", "created_at", "updated_at" FROM `libraries`;--> statement-breakpoint
DROP TABLE `libraries`;--> statement-breakpoint
ALTER TABLE `__new_libraries` RENAME TO `libraries`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `libraries_key_unique` ON `libraries` (`key`);