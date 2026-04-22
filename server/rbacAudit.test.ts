/**
 * RBAC and Audit Logging Tests
 * Tests role-based access control and audit trail functionality
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { getDb } from './db';
import { tenantMembers, auditLogs, tokenAuditLogs } from '../drizzle/schema';
import {
  getUserRole,
  hasRole,
  isAdmin,
  isBrokerOrAdmin,
  getRolePermissions,
  roleHasPermission,
} from './lib/rbac-middleware';
import {
  logAuditEvent,
  logTokenAuditEvent,
  getAuditLogs,
  getTokenAuditLogs,
  getAuditLogsByAction,
  getAuditLogsByUser,
} from './lib/audit-logger';

describe('RBAC and Audit Logging', () => {
  let db: any;
  const testTenantId = 1;
  const adminUserId = 1001;
  const brokerUserId = 1002;
  const memberUserId = 1003;
  const agentUserId = 1004;

  beforeAll(async () => {
    db = await getDb();
    if (!db) {
      throw new Error('Database connection failed');
    }

    // Create test users with different roles
    await db.insert(tenantMembers).values([
      {
        tenantId: testTenantId,
        userId: adminUserId,
        role: 'admin',
        status: 'active',
      },
      {
        tenantId: testTenantId,
        userId: brokerUserId,
        role: 'broker',
        status: 'active',
      },
      {
        tenantId: testTenantId,
        userId: memberUserId,
        role: 'member',
        status: 'active',
      },
      {
        tenantId: testTenantId,
        userId: agentUserId,
        role: 'agent',
        status: 'active',
      },
    ]);
  });

  describe('Role-Based Access Control', () => {
    it('should get user role', async () => {
      const role = await getUserRole(adminUserId, testTenantId);
      expect(role).toBe('admin');
    });

    it('should verify admin role', async () => {
      const isAdminUser = await isAdmin(adminUserId, testTenantId);
      expect(isAdminUser).toBe(true);
    });

    it('should deny admin role for non-admin', async () => {
      const isAdminUser = await isAdmin(brokerUserId, testTenantId);
      expect(isAdminUser).toBe(false);
    });

    it('should verify broker or admin', async () => {
      const isBroker = await isBrokerOrAdmin(brokerUserId, testTenantId);
      expect(isBroker).toBe(true);

      const isAdminBroker = await isBrokerOrAdmin(adminUserId, testTenantId);
      expect(isAdminBroker).toBe(true);
    });

    it('should deny broker for non-broker', async () => {
      const isBroker = await isBrokerOrAdmin(memberUserId, testTenantId);
      expect(isBroker).toBe(false);
    });

    it('should check role has permission', () => {
      const adminCanManageUsers = roleHasPermission('admin', 'manage_users');
      expect(adminCanManageUsers).toBe(true);

      const agentCanManageUsers = roleHasPermission('agent', 'manage_users');
      expect(agentCanManageUsers).toBe(false);

      const agentCanViewOwnStats = roleHasPermission('agent', 'view_own_stats');
      expect(agentCanViewOwnStats).toBe(true);
    });

    it('should get role permissions', () => {
      const adminPerms = getRolePermissions('admin');
      expect(adminPerms).toContain('manage_users');
      expect(adminPerms).toContain('manage_roles');
      expect(adminPerms).toContain('view_audit_logs');

      const agentPerms = getRolePermissions('agent');
      expect(agentPerms).toContain('view_own_stats');
      expect(agentPerms.length).toBeLessThan(adminPerms.length);
    });
  });

  describe('Audit Logging', () => {
    it('should log audit event', async () => {
      await logAuditEvent({
        tenantId: testTenantId,
        adminId: adminUserId,
        adminName: 'Test Admin',
        adminEmail: 'admin@test.com',
        action: 'user_created',
        targetType: 'user',
        targetId: memberUserId,
        targetName: 'New Member',
        details: 'Created new team member',
      });

      const logs = await getAuditLogs(testTenantId, 10);
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].action).toBe('user_created');
    });

    it('should log token audit event', async () => {
      await logTokenAuditEvent({
        tenantId: testTenantId,
        userId: adminUserId,
        tokenId: 1,
        action: 'token_created',
        status: 'success',
        ipAddress: '192.168.1.1',
      });

      const logs = await getTokenAuditLogs(testTenantId, adminUserId, 10);
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].action).toBe('token_created');
    });

    it('should get audit logs by action', async () => {
      await logAuditEvent({
        tenantId: testTenantId,
        adminId: adminUserId,
        adminName: 'Test Admin',
        action: 'oauth_connected',
        targetType: 'user',
        targetId: brokerUserId,
      });

      const logs = await getAuditLogsByAction(testTenantId, 'oauth_connected', 10);
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].action).toBe('oauth_connected');
    });

    it('should get audit logs by user', async () => {
      const logs = await getAuditLogsByUser(testTenantId, adminUserId, 10);
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].adminId).toBe(adminUserId);
    });

    it('should track multiple audit events', async () => {
      const actions: Array<'user_created' | 'user_deleted' | 'user_role_changed' | 'upload_deleted' | 'upload_viewed' | 'settings_changed' | 'data_exported' | 'tenant_settings_changed' | 'oauth_connected' | 'oauth_disconnected'> = [
        'user_created',
        'user_role_changed',
        'settings_changed',
      ];

      for (const action of actions) {
        await logAuditEvent({
          tenantId: testTenantId,
          adminId: adminUserId,
          adminName: 'Test Admin',
          action,
          targetType: 'user',
          targetId: memberUserId,
        });
      }

      const logs = await getAuditLogs(testTenantId, 100);
      expect(logs.length).toBeGreaterThanOrEqual(actions.length);
    });

    it('should maintain audit trail integrity', async () => {
      // Log multiple events
      await logAuditEvent({
        tenantId: testTenantId,
        adminId: adminUserId,
        adminName: 'Admin User',
        action: 'user_created',
        targetType: 'user',
        targetId: 9999,
      });

      await logAuditEvent({
        tenantId: testTenantId,
        adminId: brokerUserId,
        adminName: 'Broker User',
        action: 'settings_changed',
        targetType: 'tenant',
        targetId: testTenantId,
      });

      // Verify logs are separate
      const adminLogs = await getAuditLogsByUser(testTenantId, adminUserId, 100);
      const brokerLogs = await getAuditLogsByUser(testTenantId, brokerUserId, 100);

      expect(adminLogs.length).toBeGreaterThan(0);
      expect(brokerLogs.length).toBeGreaterThan(0);

      // Verify admin logs don't contain broker actions
      const brokerActionsInAdminLogs = adminLogs.filter((log: any) => log.adminId === brokerUserId);
      expect(brokerActionsInAdminLogs.length).toBe(0);
    });
  });

  describe('RBAC + Audit Integration', () => {
    it('should log role-based actions', async () => {
      // Admin performs action
      const adminRole = await getUserRole(adminUserId, testTenantId);
      expect(adminRole).toBe('admin');

      await logAuditEvent({
        tenantId: testTenantId,
        adminId: adminUserId,
        adminName: 'Admin',
        action: 'user_role_changed',
        targetType: 'user',
        targetId: memberUserId,
        details: `Changed role from member to broker`,
      });

      // Verify audit log
      const logs = await getAuditLogsByAction(testTenantId, 'user_role_changed', 10);
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].adminId).toBe(adminUserId);
    });

    it('should track permission-based operations', async () => {
      const brokerCanExport = roleHasPermission('broker', 'export_data');
      expect(brokerCanExport).toBe(true);

      if (brokerCanExport) {
        await logAuditEvent({
          tenantId: testTenantId,
          adminId: brokerUserId,
          adminName: 'Broker',
          action: 'data_exported',
          targetType: 'system',
          details: 'Exported agent leaderboard',
        });

        const logs = await getAuditLogsByAction(testTenantId, 'data_exported', 10);
        expect(logs.length).toBeGreaterThan(0);
      }
    });
  });
});
