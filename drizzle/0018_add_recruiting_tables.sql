CREATE TABLE `recruiting_prospects` (
`id` varchar(64) NOT NULL,
`tenantId` int NOT NULL,
`firstName` varchar(255) NOT NULL,
`lastName` varchar(255) NOT NULL,
`email` varchar(320) NOT NULL,
`primaryPhone` varchar(20),
`mobilePhone` varchar(20),
`office` varchar(255),
`agentAddress` text,
`officeLocation` varchar(255),
`mlsId` varchar(64),
`listSideUnits` decimal(10,1),
`listSideVolume` decimal(15,2),
`salesSideUnits` decimal(10,1),
`salesSideVolume` decimal(15,2),
`totalUnits` decimal(10,1),
`totalVolume` decimal(15,2),
`pipelineStatus` enum('lead','contacted','interviewing','offer_extended','onboarding','hired','declined') NOT NULL DEFAULT 'lead',
`sourceType` enum('market_view_broker','manual_entry') NOT NULL DEFAULT 'market_view_broker',
`importedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
`lastUpdated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
`notes` text,
`isActive` int NOT NULL DEFAULT 1,
CONSTRAINT `recruiting_prospects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `recruiting_prospects_tenant_idx` ON `recruiting_prospects` (`tenantId`);--> statement-breakpoint
CREATE INDEX `recruiting_prospects_email_idx` ON `recruiting_prospects` (`email`);--> statement-breakpoint
CREATE INDEX `recruiting_prospects_status_idx` ON `recruiting_prospects` (`pipelineStatus`);--> statement-breakpoint
CREATE INDEX `recruiting_prospects_active_idx` ON `recruiting_prospects` (`isActive`);--> statement-breakpoint
CREATE INDEX `recruiting_prospects_tenant_status_idx` ON `recruiting_prospects` (`tenantId`,`pipelineStatus`);--> statement-breakpoint
CREATE TABLE `recruiting_pipeline_activity` (
`id` varchar(64) NOT NULL,
`tenantId` int NOT NULL,
`prospectId` varchar(64) NOT NULL,
`activityType` enum('status_change','note_added','call_logged','email_sent','meeting_scheduled','offer_sent') NOT NULL,
`previousStatus` enum('lead','contacted','interviewing','offer_extended','onboarding','hired','declined'),
`newStatus` enum('lead','contacted','interviewing','offer_extended','onboarding','hired','declined'),
`details` text,
`createdBy` int NOT NULL,
`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
CONSTRAINT `recruiting_pipeline_activity_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `recruiting_activity_tenant_idx` ON `recruiting_pipeline_activity` (`tenantId`);--> statement-breakpoint
CREATE INDEX `recruiting_activity_prospect_idx` ON `recruiting_pipeline_activity` (`prospectId`);--> statement-breakpoint
CREATE INDEX `recruiting_activity_type_idx` ON `recruiting_pipeline_activity` (`activityType`);--> statement-breakpoint
CREATE INDEX `recruiting_activity_created_at_idx` ON `recruiting_pipeline_activity` (`createdAt`);--> statement-breakpoint
CREATE TABLE `recruiting_import_history` (
`id` varchar(64) NOT NULL,
`tenantId` int NOT NULL,
`fileName` varchar(255) NOT NULL,
`importType` enum('market_view_broker','retention_data') NOT NULL,
`recordsImported` int NOT NULL,
`recordsSkipped` int NOT NULL DEFAULT 0,
`importedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
`importedBy` int NOT NULL,
`status` enum('success','partial','failed') NOT NULL DEFAULT 'success',
`errorDetails` text,
CONSTRAINT `recruiting_import_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `import_history_tenant_idx` ON `recruiting_import_history` (`tenantId`);--> statement-breakpoint
CREATE INDEX `import_history_type_idx` ON `recruiting_import_history` (`importType`);--> statement-breakpoint
CREATE INDEX `import_history_imported_at_idx` ON `recruiting_import_history` (`importedAt`);--> statement-breakpoint
CREATE TABLE `prospect_activity` (
`id` varchar(64) NOT NULL,
`tenantId` int NOT NULL,
`prospectId` varchar(64) NOT NULL,
`activityType` enum('note','call','email','meeting','offer','status_change') NOT NULL,
`title` varchar(255) NOT NULL,
`description` text,
`notes` text,
`contactMethod` enum('phone','email','in_person','video_call'),
`contactDate` timestamp,
`duration` int,
`offerAmount` decimal(12,2),
`offerStatus` enum('pending','accepted','rejected','negotiating'),
`createdBy` int NOT NULL,
`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
`updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
CONSTRAINT `prospect_activity_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `activity_tenant_idx` ON `prospect_activity` (`tenantId`);--> statement-breakpoint
CREATE INDEX `activity_prospect_idx` ON `prospect_activity` (`prospectId`);--> statement-breakpoint
CREATE INDEX `activity_type_idx` ON `prospect_activity` (`activityType`);--> statement-breakpoint
CREATE INDEX `activity_created_at_idx` ON `prospect_activity` (`createdAt`);--> statement-breakpoint
CREATE INDEX `activity_tenant_prospect_idx` ON `prospect_activity` (`tenantId`,`prospectId`);--> statement-breakpoint
CREATE TABLE `retention_alerts` (
`id` varchar(64) NOT NULL,
`tenantId` int NOT NULL,
`agentName` varchar(255) NOT NULL,
`riskLevel` enum('low','medium','high') NOT NULL,
`dealChangePercent` decimal(6,2) NOT NULL,
`volumeChangePercent` decimal(6,2) NOT NULL,
`alertStatus` enum('active','acknowledged','resolved','dismissed') NOT NULL DEFAULT 'active',
`acknowledgedBy` int,
`acknowledgedAt` timestamp,
`emailSent` int NOT NULL DEFAULT 0,
`emailSentAt` timestamp,
`emailRecipients` text,
`retentionAction` text,
`actionTaken` text,
`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
`updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
CONSTRAINT `retention_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `alert_tenant_idx` ON `retention_alerts` (`tenantId`);--> statement-breakpoint
CREATE INDEX `alert_agent_idx` ON `retention_alerts` (`agentName`);--> statement-breakpoint
CREATE INDEX `alert_risk_level_idx` ON `retention_alerts` (`riskLevel`);--> statement-breakpoint
CREATE INDEX `alert_status_idx` ON `retention_alerts` (`alertStatus`);--> statement-breakpoint
CREATE INDEX `alert_tenant_status_idx` ON `retention_alerts` (`tenantId`,`alertStatus`);--> statement-breakpoint
CREATE INDEX `alert_created_at_idx` ON `retention_alerts` (`createdAt`);
