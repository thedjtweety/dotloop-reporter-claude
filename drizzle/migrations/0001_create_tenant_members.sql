CREATE TABLE IF NOT EXISTS `tenant_members` (
  `id` int AUTO_INCREMENT NOT NULL,
  `tenantId` int NOT NULL,
  `userId` int NOT NULL,
  `role` enum('admin', 'broker', 'member', 'agent') NOT NULL,
  `joinedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `invitedBy` int,
  `invitedAt` timestamp,
  `status` enum('active', 'invited', 'inactive') NOT NULL DEFAULT 'active',
  `permissions` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `tenant_members_tenant_idx` (`tenantId`),
  INDEX `tenant_members_user_idx` (`userId`),
  UNIQUE INDEX `tenant_members_tenant_user_unique` (`tenantId`, `userId`),
  INDEX `tenant_members_role_idx` (`role`),
  INDEX `tenant_members_status_idx` (`status`)
);
