CREATE TABLE `brokerage_branding` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`brokerageName` varchar(255) NOT NULL,
	`tagline` text,
	`address` text,
	`phone` varchar(20),
	`licenseNumber` varchar(100),
	`primaryColor` varchar(7) NOT NULL DEFAULT '#10b981',
	`secondaryColor` varchar(7) NOT NULL DEFAULT '#3b82f6',
	`accentColor` varchar(7) NOT NULL DEFAULT '#8b5cf6',
	`logoUrl` text,
	`logoFileName` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `brokerage_branding_id` PRIMARY KEY(`id`),
	CONSTRAINT `brokerage_branding_tenantId_unique` UNIQUE(`tenantId`)
);
--> statement-breakpoint
CREATE TABLE `cda_documents` (
	`id` varchar(64) NOT NULL,
	`tenantId` int NOT NULL,
	`documentName` varchar(255) NOT NULL,
	`description` text,
	`transactionId` varchar(255),
	`loopName` varchar(255),
	`closingCompany` varchar(255),
	`closingOfficer` varchar(255),
	`propertyAddress` text,
	`salePrice` decimal(15,2),
	`closingDate` varchar(10),
	`totalCommissionRate` decimal(5,2),
	`listingSide` decimal(5,2),
	`buyingSide` decimal(5,2),
	`referralFee` decimal(5,2),
	`franchiseFee` decimal(5,2),
	`listingAgentSplit` decimal(5,2),
	`buyingAgentSplit` decimal(5,2),
	`agentsData` text NOT NULL,
	`deductions` text,
	`disbursementInstructions` text,
	`pdfUrl` text,
	`pdfFileName` varchar(255),
	`status` enum('draft','generated','approved','archived') NOT NULL DEFAULT 'draft',
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`approvedBy` int,
	`approvedAt` timestamp,
	CONSTRAINT `cda_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `brokerage_branding_tenant_idx` ON `brokerage_branding` (`tenantId`);--> statement-breakpoint
CREATE INDEX `cda_documents_tenant_idx` ON `cda_documents` (`tenantId`);--> statement-breakpoint
CREATE INDEX `cda_documents_status_idx` ON `cda_documents` (`status`);--> statement-breakpoint
CREATE INDEX `cda_documents_created_by_idx` ON `cda_documents` (`createdBy`);--> statement-breakpoint
CREATE INDEX `cda_documents_transaction_idx` ON `cda_documents` (`transactionId`);--> statement-breakpoint
CREATE INDEX `cda_documents_created_at_idx` ON `cda_documents` (`createdAt`);