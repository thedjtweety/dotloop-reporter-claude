/**
 * Tenant Middleware Tests
 * Tests tenant context, access verification, and role-based checks
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { getDb } from './db';
import { tenantMembers } from '../drizzle/schema';
import {
  getTenantContext,
  getAllTenantContexts,
  verifyTenantAccess,
  verifyTenantAdmin,
  verifyTenantBroker,
} from './lib/tenant-middleware';

describe('Tenant Middleware', () => {
  let db: any;
  let testUserId: number;
  let testTenantId: number;

  beforeAll(async () => {
    db = await getDb();
    if (!db) {
      throw new Error('Database connection failed');
    }

    // Use test IDs
    testUserId = 9999;
    testTenantId = 1;

    // Create a test tenant member
    await db.insert(tenantMembers).values({
      tenantId: testTenantId,
      userId: testUserId,
      role: 'admin',
      status: 'active',
    });
  });

  describe('getTenantContext', () => {
    it('should return tenant context for active user', async () => {
      const context = await getTenantContext(testUserId);
      
      expect(context).toBeDefined();
      expect(context?.tenantId).toBe(testTenantId);
      expect(context?.userId).toBe(testUserId);
      expect(context?.role).toBe('admin');
    });

    it('should return null for non-existent user', async () => {
      const context = await getTenantContext(99999);
      expect(context).toBeNull();
    });
  });

  describe('getAllTenantContexts', () => {
    it('should return all tenant contexts for user', async () => {
      const contexts = await getAllTenantContexts(testUserId);
      
      expect(contexts).toBeDefined();
      expect(contexts.length).toBeGreaterThan(0);
      expect(contexts[0].userId).toBe(testUserId);
    });

    it('should return empty array for non-existent user', async () => {
      const contexts = await getAllTenantContexts(99999);
      expect(contexts).toEqual([]);
    });
  });

  describe('verifyTenantAccess', () => {
    it('should verify user has access to tenant', async () => {
      const hasAccess = await verifyTenantAccess(testUserId, testTenantId);
      expect(hasAccess).toBe(true);
    });

    it('should deny access for non-member user', async () => {
      const hasAccess = await verifyTenantAccess(99999, testTenantId);
      expect(hasAccess).toBe(false);
    });

    it('should deny access to non-existent tenant', async () => {
      const hasAccess = await verifyTenantAccess(testUserId, 99999);
      expect(hasAccess).toBe(false);
    });
  });

  describe('verifyTenantAdmin', () => {
    it('should verify admin user', async () => {
      const isAdmin = await verifyTenantAdmin(testUserId, testTenantId);
      expect(isAdmin).toBe(true);
    });

    it('should deny non-admin user', async () => {
      // Create a non-admin member
      const nonAdminId = 8888;
      await db.insert(tenantMembers).values({
        tenantId: testTenantId,
        userId: nonAdminId,
        role: 'member',
        status: 'active',
      });

      const isAdmin = await verifyTenantAdmin(nonAdminId, testTenantId);
      expect(isAdmin).toBe(false);
    });
  });

  describe('verifyTenantBroker', () => {
    it('should verify broker user', async () => {
      // Create a broker member
      const brokerId = 7777;
      await db.insert(tenantMembers).values({
        tenantId: testTenantId,
        userId: brokerId,
        role: 'broker',
        status: 'active',
      });

      const isBroker = await verifyTenantBroker(brokerId, testTenantId);
      expect(isBroker).toBe(true);
    });

    it('should verify admin as broker', async () => {
      // Admin should also pass broker check
      const isBroker = await verifyTenantBroker(testUserId, testTenantId);
      expect(isBroker).toBe(true);
    });

    it('should deny non-broker user', async () => {
      // Create an agent member
      const agentId = 6666;
      await db.insert(tenantMembers).values({
        tenantId: testTenantId,
        userId: agentId,
        role: 'agent',
        status: 'active',
      });

      const isBroker = await verifyTenantBroker(agentId, testTenantId);
      expect(isBroker).toBe(false);
    });
  });

  describe('Tenant Isolation', () => {
    it('should prevent cross-tenant access', async () => {
      // Create user in different tenant
      const otherTenantId = 2;
      const otherUserId = 5555;

      await db.insert(tenantMembers).values({
        tenantId: otherTenantId,
        userId: otherUserId,
        role: 'admin',
        status: 'active',
      });

      // Verify user cannot access other tenant
      const hasAccess = await verifyTenantAccess(otherUserId, testTenantId);
      expect(hasAccess).toBe(false);

      // Verify user can access their own tenant
      const hasOwnAccess = await verifyTenantAccess(otherUserId, otherTenantId);
      expect(hasOwnAccess).toBe(true);
    });

    it('should support multi-tenant users', async () => {
      // Create user in multiple tenants
      const multiTenantUserId = 4444;
      const tenant1 = 1;
      const tenant2 = 2;

      await db.insert(tenantMembers).values({
        tenantId: tenant1,
        userId: multiTenantUserId,
        role: 'admin',
        status: 'active',
      });

      await db.insert(tenantMembers).values({
        tenantId: tenant2,
        userId: multiTenantUserId,
        role: 'broker',
        status: 'active',
      });

      // Verify user can access both tenants
      const contexts = await getAllTenantContexts(multiTenantUserId);
      expect(contexts.length).toBeGreaterThanOrEqual(2);

      const hasAccess1 = await verifyTenantAccess(multiTenantUserId, tenant1);
      const hasAccess2 = await verifyTenantAccess(multiTenantUserId, tenant2);

      expect(hasAccess1).toBe(true);
      expect(hasAccess2).toBe(true);
    });
  });
});
