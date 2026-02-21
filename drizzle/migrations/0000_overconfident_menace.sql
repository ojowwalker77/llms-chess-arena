CREATE TABLE `matches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tournament_id` integer,
	`white_model_id` integer NOT NULL,
	`black_model_id` integer NOT NULL,
	`result` text,
	`result_reason` text,
	`pgn` text,
	`white_scratch_pad` text DEFAULT '' NOT NULL,
	`black_scratch_pad` text DEFAULT '' NOT NULL,
	`white_avg_cpl` real,
	`black_avg_cpl` real,
	`status` text DEFAULT 'pending' NOT NULL,
	`total_moves` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`completed_at` text,
	FOREIGN KEY (`tournament_id`) REFERENCES `tournaments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`white_model_id`) REFERENCES `models`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`black_model_id`) REFERENCES `models`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `models` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`openrouter_id` text NOT NULL,
	`elo_rating` real DEFAULT 1500 NOT NULL,
	`games_played` integer DEFAULT 0 NOT NULL,
	`wins` integer DEFAULT 0 NOT NULL,
	`draws` integer DEFAULT 0 NOT NULL,
	`losses` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `models_openrouter_id_unique` ON `models` (`openrouter_id`);--> statement-breakpoint
CREATE TABLE `moves` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`match_id` integer NOT NULL,
	`move_number` integer NOT NULL,
	`color` text NOT NULL,
	`san` text NOT NULL,
	`uci` text NOT NULL,
	`fen_after` text NOT NULL,
	`engine_eval` real,
	`created_at` text NOT NULL,
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `tournaments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`model_ids` text NOT NULL,
	`created_at` text NOT NULL,
	`completed_at` text
);
