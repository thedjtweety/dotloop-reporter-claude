CREATE TABLE `cda_field_mappings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`templateId` varchar(64) NOT NULL,
	`csvColumn` varchar(255),
	`cdaField` varchar(255) NOT NULL,
	`transformFunction` varchar(100),
	`defaultValue` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cda_field_mappings_id` PRIMARY KEY(`id`)
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
	`notes` text,
	CONSTRAINT `cda_generated_id` PRIMARY KEY(`id`)
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
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cda_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
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
CREATE INDEX `cda_templates_created_by_idx` ON `cda_templates` (`createdBy`);