ALTER TABLE `users` MODIFY COLUMN `role` enum('admin','broker','agent','viewer') NOT NULL DEFAULT 'viewer';--> statement-breakpoint
ALTER TABLE `user_preferences` ADD `commissionVisibility` enum('public','team','admin_only','private') DEFAULT 'admin_only' NOT NULL;--> statement-breakpoint
ALTER TABLE `user_preferences` ADD `allowOthersViewMyCommission` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `user_preferences` ADD `allowOthersViewMyTransactions` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `user_preferences` ADD `showInLeaderboard` int DEFAULT 1 NOT NULL;