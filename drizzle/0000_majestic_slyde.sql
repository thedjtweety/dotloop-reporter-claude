-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE `agent_assignments` (
	`id` varchar(64) NOT NULL,
	`tenantId` int NOT NULL,
	`agentName` varchar(255) NOT NULL,
	`planId` varchar(64) NOT NULL,
	`teamId` varchar(64),
	`anniversaryDate` varchar(5),
	`startDate` varchar(10),
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`adminId` int NOT NULL,
	`adminName` varchar(255) NOT NULL,
	`adminEmail` varchar(320),
	`action` enum('user_created','user_deleted','user_role_changed','upload_deleted','upload_viewed','settings_changed','data_exported','tenant_settings_changed','oauth_connected','oauth_disconnected') NOT NULL,
	`targetType` enum('user','upload','system','tenant'),
	`targetId` int,
	`targetName` varchar(255),
	`details` text,
	`ipAddress` varchar(45),
	`userAgent` text,
	`createdAt` timestamp(3) NOT NULL DEFAULT 'CURRENT_TIMESTAMP(3)'
);
--> statement-breakpoint
CREATE TABLE `cda_field_mappings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`templateId` varchar(64) NOT NULL,
	`csvColumn` varchar(255),
	`cdaField` varchar(255) NOT NULL,
	`transformFunction` varchar(100),
	`defaultValue` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `cda_generated` (
	`id` varchar(64) NOT NULL,
	`tenantId` int NOT NULL,
	`templateId` varchar(64) NOT NULL,
	`transactionId` varchar(64),
	`propertyAddress` varchar(500),
	`mlsNumber` varchar(100),
	`salePrice` decimal(12,2),
	`closingDate` varchar(10),
	`grossCommission` decimal(12,2),
	`commissionRate` decimal(5,2),
	`pdfPath` text,
	`pdfFileName` varchar(255),
	`status` enum('draft','pending_approval','approved','sent','completed') NOT NULL DEFAULT 'draft',
	`generatedBy` int NOT NULL,
	`generatedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`approvedBy` int,
	`approvedAt` timestamp,
	`sentAt` timestamp,
	`calculationData` text,
	`notes` text
);
--> statement-breakpoint
CREATE TABLE `cda_templates` (
	`id` varchar(64) NOT NULL,
	`tenantId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`brokerageName` varchar(255) NOT NULL,
	`brokerageAddress` text,
	`brokerageLogo` text,
	`brokerName` varchar(255),
	`brokerEmail` varchar(320),
	`brokerPhone` varchar(50),
	`defaultSettings` text,
	`isActive` int NOT NULL DEFAULT 1,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `commission_calculations` (
	`id` varchar(64) NOT NULL,
	`tenantId` int NOT NULL,
	`uploadId` int,
	`calculationDate` varchar(10) NOT NULL,
	`breakdowns` text NOT NULL,
	`ytdSummaries` text NOT NULL,
	`transactionCount` int NOT NULL,
	`agentCount` int NOT NULL,
	`totalCompanyDollar` int NOT NULL,
	`totalGrossCommission` int NOT NULL,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `commission_plans` (
	`id` varchar(64) NOT NULL,
	`tenantId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`splitPercentage` int NOT NULL,
	`capAmount` int NOT NULL DEFAULT 0,
	`postCapSplit` int NOT NULL DEFAULT 100,
	`deductions` text,
	`royaltyPercentage` int,
	`royaltyCap` int,
	`description` text,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP,
	`useSliding` int NOT NULL DEFAULT 0,
	`tiers` text
);
--> statement-breakpoint
CREATE TABLE `oauth_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`userId` int NOT NULL,
	`provider` varchar(50) NOT NULL DEFAULT 'dotloop',
	`encryptedAccessToken` text NOT NULL,
	`encryptedRefreshToken` text NOT NULL,
	`tokenExpiresAt` timestamp NOT NULL,
	`encryptionKeyVersion` int NOT NULL DEFAULT 1,
	`tokenHash` varchar(64) NOT NULL,
	`ipAddress` varchar(45),
	`userAgent` text,
	`deviceFingerprint` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP,
	`lastUsedAt` timestamp,
	`lastRefreshedAt` timestamp,
	`dotloopAccountId` int,
	`dotloopProfileId` int,
	`dotloopDefaultProfileId` int,
	`dotloopProfileIds` text,
	`connectionName` varchar(255),
	`isActive` int NOT NULL DEFAULT 1,
	`isPrimary` int NOT NULL DEFAULT 0,
	`dotloopAccountEmail` varchar(320),
	`dotloopAccountName` varchar(255)
);
--> statement-breakpoint
CREATE TABLE `platform_admin_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adminUserId` int NOT NULL,
	`tenantId` int,
	`action` varchar(100) NOT NULL,
	`reason` text,
	`details` text,
	`ipAddress` varchar(45) NOT NULL,
	`userAgent` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `teams` (
	`id` varchar(64) NOT NULL,
	`tenantId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`leadAgent` varchar(255) NOT NULL,
	`teamSplitPercentage` int NOT NULL,
	`description` text,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
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
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`subdomain` varchar(63) NOT NULL,
	`customDomain` varchar(255),
	`status` enum('active','suspended','deleted') NOT NULL DEFAULT 'active',
	`subscriptionTier` enum('free','basic','professional','enterprise') NOT NULL DEFAULT 'free',
	`settings` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `tier_history` (
	`id` varchar(64) NOT NULL,
	`tenantId` int NOT NULL,
	`agentName` varchar(255) NOT NULL,
	`planId` varchar(64) NOT NULL,
	`previousTierIndex` int,
	`previousTierThreshold` int,
	`previousSplitPercentage` int,
	`newTierIndex` int NOT NULL,
	`newTierThreshold` int NOT NULL,
	`newSplitPercentage` int NOT NULL,
	`ytdAmount` int NOT NULL,
	`transactionId` varchar(255),
	`transactionDate` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `token_audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`userId` int,
	`tokenId` int,
	`action` enum('token_created','token_refreshed','token_used','token_revoked','token_decryption_failed','suspicious_access','rate_limit_exceeded','security_alert') NOT NULL,
	`status` enum('success','failure','warning') NOT NULL,
	`errorMessage` text,
	`ipAddress` varchar(45) NOT NULL,
	`userAgent` text,
	`requestId` varchar(255),
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`uploadId` int NOT NULL,
	`userId` int NOT NULL,
	`loopId` varchar(255),
	`loopViewUrl` text,
	`loopName` varchar(500),
	`loopStatus` varchar(100),
	`createdDate` varchar(50),
	`closingDate` varchar(50),
	`listingDate` varchar(50),
	`offerDate` varchar(50),
	`address` text,
	`price` int,
	`propertyType` varchar(100),
	`bedrooms` int,
	`bathrooms` int,
	`squareFootage` int,
	`city` varchar(100),
	`state` varchar(50),
	`county` varchar(100),
	`leadSource` varchar(100),
	`agents` text,
	`createdBy` varchar(255),
	`earnestMoney` int,
	`salePrice` int,
	`commissionRate` int,
	`commissionTotal` int,
	`buySideCommission` int,
	`sellSideCommission` int,
	`companyDollar` int,
	`referralSource` varchar(255),
	`referralPercentage` int,
	`complianceStatus` varchar(100),
	`tags` text,
	`originalPrice` int,
	`yearBuilt` int,
	`lotSize` int,
	`subdivision` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `upload_activity_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`uploadId` int NOT NULL,
	`userTeamId` int NOT NULL,
	`userId` int NOT NULL,
	`action` enum('shared','viewed','downloaded','deleted') NOT NULL,
	`details` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `upload_sharing` (
	`id` int AUTO_INCREMENT NOT NULL,
	`uploadId` int NOT NULL,
	`userTeamId` int NOT NULL,
	`sharedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`sharedBy` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE `upload_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`uploadId` int NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`uploadedAt` timestamp NOT NULL,
	`totalTransactions` int NOT NULL,
	`totalSalesVolume` int NOT NULL,
	`averagePrice` int NOT NULL,
	`totalCommission` int NOT NULL,
	`closingRate` int NOT NULL,
	`avgDaysToClose` int NOT NULL,
	`activeListings` int NOT NULL,
	`underContract` int NOT NULL,
	`closedDeals` int NOT NULL,
	`archivedDeals` int NOT NULL,
	`totalCompanyDollar` int NOT NULL,
	`buySideCommission` int NOT NULL,
	`sellSideCommission` int NOT NULL,
	`metricsJson` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `uploads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`userId` int NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`recordCount` int NOT NULL,
	`uploadedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`fileSize` int,
	`validationTimeMs` int,
	`parsingTimeMs` int,
	`uploadTimeMs` int,
	`totalTimeMs` int,
	`status` enum('success','failed','partial') NOT NULL DEFAULT 'success',
	`errorMessage` text
);
--> statement-breakpoint
CREATE TABLE `user_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`tenantId` int NOT NULL,
	`activeOAuthTokenId` int,
	`defaultUploadView` varchar(50) DEFAULT 'dashboard',
	`theme` varchar(20) DEFAULT 'light',
	`updatedAt` timestamp DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP,
	`commissionVisibility` enum('public','team','admin_only','private') NOT NULL DEFAULT 'admin_only',
	`allowOthersViewMyCommission` int NOT NULL DEFAULT 0,
	`allowOthersViewMyTransactions` int NOT NULL DEFAULT 1,
	`showInLeaderboard` int NOT NULL DEFAULT 1
);
--> statement-breakpoint
CREATE TABLE `user_team_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userTeamId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('owner','editor','viewer') NOT NULL DEFAULT 'viewer',
	`addedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`addedBy` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_teams` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`ownerId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`openId` varchar(64),
	`dotloopUserId` varchar(64),
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('admin','broker','agent','viewer') NOT NULL DEFAULT 'viewer',
	`status` enum('active','inactive','suspended') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE INDEX `agent_assignments_tenant_agent_unique` ON `agent_assignments` (`tenantId`,`agentName`);--> statement-breakpoint
CREATE INDEX `agent_assignments_tenant_idx` ON `agent_assignments` (`tenantId`);--> statement-breakpoint
CREATE INDEX `agent_assignments_agent_idx` ON `agent_assignments` (`agentName`);--> statement-breakpoint
CREATE INDEX `agent_assignments_plan_idx` ON `agent_assignments` (`planId`);--> statement-breakpoint
CREATE INDEX `agent_assignments_team_idx` ON `agent_assignments` (`teamId`);--> statement-breakpoint
CREATE INDEX `agent_assignments_active_idx` ON `agent_assignments` (`isActive`);--> statement-breakpoint
CREATE INDEX `tenant_idx` ON `audit_logs` (`tenantId`);--> statement-breakpoint
CREATE INDEX `action_idx` ON `audit_logs` (`action`);--> statement-breakpoint
CREATE INDEX `adminId_idx` ON `audit_logs` (`adminId`);--> statement-breakpoint
CREATE INDEX `tenant_createdAt_idx` ON `audit_logs` (`tenantId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `adminId_createdAt_idx` ON `audit_logs` (`adminId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `targetType_targetId_idx` ON `audit_logs` (`targetType`,`targetId`);--> statement-breakpoint
CREATE INDEX `cda_field_mappings_template_idx` ON `cda_field_mappings` (`templateId`);--> statement-breakpoint
CREATE INDEX `cda_field_mappings_cda_field_idx` ON `cda_field_mappings` (`cdaField`);--> statement-breakpoint
CREATE INDEX `cda_generated_tenant_idx` ON `cda_generated` (`tenantId`);--> statement-breakpoint
CREATE INDEX `cda_generated_template_idx` ON `cda_generated` (`templateId`);--> statement-breakpoint
CREATE INDEX `cda_generated_transaction_idx` ON `cda_generated` (`transactionId`);--> statement-breakpoint
CREATE INDEX `cda_generated_status_idx` ON `cda_generated` (`status`);--> statement-breakpoint
CREATE INDEX `cda_generated_generated_by_idx` ON `cda_generated` (`generatedBy`);--> statement-breakpoint
CREATE INDEX `cda_generated_generated_at_idx` ON `cda_generated` (`generatedAt`);--> statement-breakpoint
CREATE INDEX `cda_templates_tenant_idx` ON `cda_templates` (`tenantId`);--> statement-breakpoint
CREATE INDEX `cda_templates_active_idx` ON `cda_templates` (`isActive`);--> statement-breakpoint
CREATE INDEX `cda_templates_created_by_idx` ON `cda_templates` (`createdBy`);--> statement-breakpoint
CREATE INDEX `commission_calculations_tenant_idx` ON `commission_calculations` (`tenantId`);--> statement-breakpoint
CREATE INDEX `commission_calculations_date_idx` ON `commission_calculations` (`calculationDate`);--> statement-breakpoint
CREATE INDEX `commission_calculations_upload_idx` ON `commission_calculations` (`uploadId`);--> statement-breakpoint
CREATE INDEX `commission_plans_tenant_idx` ON `commission_plans` (`tenantId`);--> statement-breakpoint
CREATE INDEX `commission_plans_active_idx` ON `commission_plans` (`isActive`);--> statement-breakpoint
CREATE INDEX `oauth_tokens_tokenHash_unique` ON `oauth_tokens` (`tokenHash`);--> statement-breakpoint
CREATE INDEX `tenant_idx` ON `oauth_tokens` (`tenantId`);--> statement-breakpoint
CREATE INDEX `user_idx` ON `oauth_tokens` (`userId`);--> statement-breakpoint
CREATE INDEX `tokenHash_idx` ON `oauth_tokens` (`tokenHash`);--> statement-breakpoint
CREATE INDEX `expires_idx` ON `oauth_tokens` (`tokenExpiresAt`);--> statement-breakpoint
CREATE INDEX `tenant_provider_idx` ON `oauth_tokens` (`tenantId`,`provider`);--> statement-breakpoint
CREATE INDEX `tenant_user_provider_idx` ON `oauth_tokens` (`tenantId`,`userId`,`provider`);--> statement-breakpoint
CREATE INDEX `oauth_tokens_primary_idx` ON `oauth_tokens` (`userId`,`isPrimary`);--> statement-breakpoint
CREATE INDEX `admin_idx` ON `platform_admin_logs` (`adminUserId`);--> statement-breakpoint
CREATE INDEX `tenant_idx` ON `platform_admin_logs` (`tenantId`);--> statement-breakpoint
CREATE INDEX `time_idx` ON `platform_admin_logs` (`createdAt`);--> statement-breakpoint
CREATE INDEX `admin_time_idx` ON `platform_admin_logs` (`adminUserId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `tenant_time_idx` ON `platform_admin_logs` (`tenantId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `teams_tenant_idx` ON `teams` (`tenantId`);--> statement-breakpoint
CREATE INDEX `teams_active_idx` ON `teams` (`isActive`);--> statement-breakpoint
CREATE INDEX `tenant_members_tenant_idx` ON `tenant_members` (`tenantId`);--> statement-breakpoint
CREATE INDEX `tenant_members_user_idx` ON `tenant_members` (`userId`);--> statement-breakpoint
CREATE INDEX `tenant_members_tenant_user_unique` ON `tenant_members` (`tenantId`,`userId`);--> statement-breakpoint
CREATE INDEX `tenant_members_role_idx` ON `tenant_members` (`role`);--> statement-breakpoint
CREATE INDEX `tenant_members_status_idx` ON `tenant_members` (`status`);--> statement-breakpoint
CREATE INDEX `tenants_subdomain_unique` ON `tenants` (`subdomain`);--> statement-breakpoint
CREATE INDEX `tenants_customDomain_unique` ON `tenants` (`customDomain`);--> statement-breakpoint
CREATE INDEX `subdomain_idx` ON `tenants` (`subdomain`);--> statement-breakpoint
CREATE INDEX `customDomain_idx` ON `tenants` (`customDomain`);--> statement-breakpoint
CREATE INDEX `tier_history_tenant_idx` ON `tier_history` (`tenantId`);--> statement-breakpoint
CREATE INDEX `tier_history_agent_idx` ON `tier_history` (`agentName`);--> statement-breakpoint
CREATE INDEX `tier_history_plan_idx` ON `tier_history` (`planId`);--> statement-breakpoint
CREATE INDEX `tier_history_tenant_agent_idx` ON `tier_history` (`tenantId`,`agentName`);--> statement-breakpoint
CREATE INDEX `tier_history_created_idx` ON `tier_history` (`createdAt`);--> statement-breakpoint
CREATE INDEX `tenant_time_idx` ON `token_audit_logs` (`tenantId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `action_idx` ON `token_audit_logs` (`action`,`createdAt`);--> statement-breakpoint
CREATE INDEX `suspicious_idx` ON `token_audit_logs` (`tenantId`,`createdAt`,`action`);--> statement-breakpoint
CREATE INDEX `loopId_tenant_unique` ON `transactions` (`loopId`,`tenantId`);--> statement-breakpoint
CREATE INDEX `tenant_idx` ON `transactions` (`tenantId`);--> statement-breakpoint
CREATE INDEX `upload_idx` ON `transactions` (`uploadId`);--> statement-breakpoint
CREATE INDEX `user_idx` ON `transactions` (`userId`);--> statement-breakpoint
CREATE INDEX `uploadId_user_idx` ON `transactions` (`uploadId`,`userId`);--> statement-breakpoint
CREATE INDEX `user_createdAt_idx` ON `transactions` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `tenant_createdAt_idx` ON `transactions` (`tenantId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `upload_idx` ON `upload_activity_log` (`uploadId`);--> statement-breakpoint
CREATE INDEX `user_team_idx` ON `upload_activity_log` (`userTeamId`);--> statement-breakpoint
CREATE INDEX `user_idx` ON `upload_activity_log` (`userId`);--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `upload_activity_log` (`createdAt`);--> statement-breakpoint
CREATE INDEX `upload_idx` ON `upload_sharing` (`uploadId`);--> statement-breakpoint
CREATE INDEX `user_team_idx` ON `upload_sharing` (`userTeamId`);--> statement-breakpoint
CREATE INDEX `upload_user_team_unique` ON `upload_sharing` (`uploadId`,`userTeamId`);--> statement-breakpoint
CREATE INDEX `shared_at_idx` ON `upload_sharing` (`sharedAt`);--> statement-breakpoint
CREATE INDEX `upload_snapshots_tenant_idx` ON `upload_snapshots` (`tenantId`);--> statement-breakpoint
CREATE INDEX `upload_snapshots_upload_idx` ON `upload_snapshots` (`uploadId`);--> statement-breakpoint
CREATE INDEX `upload_snapshots_tenant_uploadedAt_idx` ON `upload_snapshots` (`tenantId`,`uploadedAt`);--> statement-breakpoint
CREATE INDEX `upload_snapshots_createdAt_idx` ON `upload_snapshots` (`createdAt`);--> statement-breakpoint
CREATE INDEX `tenant_idx` ON `uploads` (`tenantId`);--> statement-breakpoint
CREATE INDEX `user_idx` ON `uploads` (`userId`);--> statement-breakpoint
CREATE INDEX `user_uploadedAt_idx` ON `uploads` (`userId`,`uploadedAt`);--> statement-breakpoint
CREATE INDEX `tenant_uploadedAt_idx` ON `uploads` (`tenantId`,`uploadedAt`);--> statement-breakpoint
CREATE INDEX `user_preferences_user_unique` ON `user_preferences` (`userId`);--> statement-breakpoint
CREATE INDEX `user_preferences_tenant_idx` ON `user_preferences` (`tenantId`);--> statement-breakpoint
CREATE INDEX `user_team_idx` ON `user_team_members` (`userTeamId`);--> statement-breakpoint
CREATE INDEX `user_idx` ON `user_team_members` (`userId`);--> statement-breakpoint
CREATE INDEX `user_team_user_unique` ON `user_team_members` (`userTeamId`,`userId`);--> statement-breakpoint
CREATE INDEX `tenant_idx` ON `user_teams` (`tenantId`);--> statement-breakpoint
CREATE INDEX `owner_idx` ON `user_teams` (`ownerId`);--> statement-breakpoint
CREATE INDEX `tenant_owner_idx` ON `user_teams` (`tenantId`,`ownerId`);--> statement-breakpoint
CREATE INDEX `openId_tenant_unique` ON `users` (`openId`,`tenantId`);--> statement-breakpoint
CREATE INDEX `email_tenant_unique` ON `users` (`email`,`tenantId`);--> statement-breakpoint
CREATE INDEX `tenant_idx` ON `users` (`tenantId`);--> statement-breakpoint
CREATE INDEX `dotloopUserId_unique` ON `users` (`dotloopUserId`);
*/