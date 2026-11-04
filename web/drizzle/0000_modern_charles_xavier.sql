CREATE TABLE `attempts` (
	`user_id` text NOT NULL,
	`attempt_key` text NOT NULL,
	`question_id` text NOT NULL,
	`answer` text NOT NULL,
	`correct` integer NOT NULL,
	`section` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `attempt_key`)
);
--> statement-breakpoint
CREATE TABLE `bookmarks` (
	`user_id` text NOT NULL,
	`question_id` text NOT NULL,
	PRIMARY KEY(`user_id`, `question_id`)
);
--> statement-breakpoint
CREATE TABLE `packs` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`version` text NOT NULL,
	`content` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
