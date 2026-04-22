CREATE TABLE `tenant_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('admin','broker','member','agent') NOT NULL,
	`joinedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`invitedBy` int,
	`invitedAt` timestamp,
	`status` enum('active','invited','inactive') NOT NULL DEFAULT 'active',
	`permissions` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenant_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `tenant_members_tenant_idx` ON `tenant_members` (`tenantId`);--> statement-breakpoint
CREATE INDEX `tenant_members_user_idx` ON `tenant_members` (`userId`);--> statement-breakpoint
CREATE INDEX `tenant_members_tenant_user_unique` ON `tenant_members` (`tenantId`,`userId`);--> statement-breakpoint
CREATE INDEX `tenant_members_role_idx` ON `tenant_members` (`role`);--> statement-breakpoint
CREATE INDEX `tenant_members_status_idx` ON `tenant_members` (`status`);