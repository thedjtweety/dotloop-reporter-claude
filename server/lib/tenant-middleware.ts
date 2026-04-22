/**
 * Tenant Middleware
 * Enforces tenant isolation and provides tenant context to all procedures
 */

import { TRPCError } from '@trpc/server';
import { getDb } from '../db';
import { tenantMembers } from '../../drizzle/schema';
import { eq, and } from 'drizzle-orm';

export interface TenantContext {
  tenantId: number;
  userId: number;
  role: 'admin' | 'broker' | 'member' | 'agent';
  permissions: string[];
}

/**
 * Get tenant context from user ID
 * Returns the user's primary tenant and role
 */
export async function getTenantContext(userId: number): Promise<TenantContext | null> {
  try {
    const db = await getDb();
    if (!db) throw new Error('Database connection failed');
    
    // Get the user's primary tenant membership (active status, admin or broker role preferred)
    const membership = await db
      .select()
      .from(tenantMembers)
      .where(and(
        eq(tenantMembers.userId, userId),
        eq(tenantMembers.status, 'active')
      ))
      .orderBy(tenantMembers.role) // admin first, then broker, etc.
      .limit(1);

    if (!membership || membership.length === 0) {
      return null;
    }

    const member = membership[0];
    const permissions = member.permissions ? JSON.parse(member.permissions) : [];

    return {
      tenantId: member.tenantId,
      userId: member.userId,
      role: member.role as 'admin' | 'broker' | 'member' | 'agent',
      permissions,
    };
  } catch (error) {
    console.error('Error getting tenant context:', error);
    return null;
  }
}

/**
 * Get all tenant contexts for a user
 * Returns all tenants the user belongs to
 */
export async function getAllTenantContexts(userId: number): Promise<TenantContext[]> {
  try {
    const db = await getDb();
    if (!db) throw new Error('Database connection failed');
    
    const memberships = await db
      .select()
      .from(tenantMembers)
      .where(and(
        eq(tenantMembers.userId, userId),
        eq(tenantMembers.status, 'active')
      ));

    return memberships.map((member: any) => ({
      tenantId: member.tenantId,
      userId: member.userId,
      role: member.role,
      permissions: member.permissions ? JSON.parse(member.permissions) : [],
    }));
  } catch (error) {
    console.error('Error getting all tenant contexts:', error);
    return [];
  }
}

/**
 * Verify user has access to a specific tenant
 */
export async function verifyTenantAccess(userId: number, tenantId: number): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) throw new Error('Database connection failed');
    
    const membership = await db
      .select()
      .from(tenantMembers)
      .where(and(
        eq(tenantMembers.userId, userId),
        eq(tenantMembers.tenantId, tenantId),
        eq(tenantMembers.status, 'active')
      ))
      .limit(1);

    return membership.length > 0;
  } catch (error) {
    console.error('Error verifying tenant access:', error);
    return false;
  }
}

/**
 * Verify user has admin role in a tenant
 */
export async function verifyTenantAdmin(userId: number, tenantId: number): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) throw new Error('Database connection failed');
    
    const membership = await db
      .select()
      .from(tenantMembers)
      .where(and(
        eq(tenantMembers.userId, userId),
        eq(tenantMembers.tenantId, tenantId),
        eq(tenantMembers.role, 'admin'),
        eq(tenantMembers.status, 'active')
      ))
      .limit(1);

    return membership.length > 0;
  } catch (error) {
    console.error('Error verifying tenant admin:', error);
    return false;
  }
}

/**
 * Verify user has broker or admin role in a tenant
 */
export async function verifyTenantBroker(userId: number, tenantId: number): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) throw new Error('Database connection failed');
    
    const membership = await db
      .select()
      .from(tenantMembers)
      .where(and(
        eq(tenantMembers.userId, userId),
        eq(tenantMembers.tenantId, tenantId),
        eq(tenantMembers.status, 'active')
      ))
      .limit(1);

    if (membership.length === 0) {
      return false;
    }

    const role = membership[0].role;
    return role === 'admin' || role === 'broker';
  } catch (error) {
    console.error('Error verifying tenant broker:', error);
    return false;
  }
}

/**
 * Middleware factory for requiring tenant access
 */
export function requireTenantAccess(tenantIdSource: 'input' | 'context' = 'context') {
  return async (opts: any) => {
    const { ctx, input, next } = opts;

    // Get tenant ID from context or input
    let tenantId: number;
    if (tenantIdSource === 'context') {
      tenantId = ctx.tenantId;
    } else {
      tenantId = input?.tenantId;
    }

    if (!tenantId) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Tenant ID is required',
      });
    }

    if (!ctx.userId) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'User ID is required',
      });
    }

    // Verify user has access to this tenant
    const hasAccess = await verifyTenantAccess(ctx.userId, tenantId);
    if (!hasAccess) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have access to this tenant',
      });
    }

    return next({
      ctx: {
        ...ctx,
        tenantId,
      },
    });
  };
}

/**
 * Middleware factory for requiring admin access
 */
export function requireTenantAdmin(tenantIdSource: 'input' | 'context' = 'context') {
  return async (opts: any) => {
    const { ctx, input, next } = opts;

    // Get tenant ID from context or input
    let tenantId: number;
    if (tenantIdSource === 'context') {
      tenantId = ctx.tenantId;
    } else {
      tenantId = input?.tenantId;
    }

    if (!tenantId) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Tenant ID is required',
      });
    }

    if (!ctx.userId) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'User ID is required',
      });
    }

    // Verify user is admin in this tenant
    const isAdmin = await verifyTenantAdmin(ctx.userId, tenantId);
    if (!isAdmin) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You must be an admin to perform this action',
      });
    }

    return next({
      ctx: {
        ...ctx,
        tenantId,
      },
    });
  };
}

/**
 * Middleware factory for requiring broker access
 */
export function requireTenantBroker(tenantIdSource: 'input' | 'context' = 'context') {
  return async (opts: any) => {
    const { ctx, input, next } = opts;

    // Get tenant ID from context or input
    let tenantId: number;
    if (tenantIdSource === 'context') {
      tenantId = ctx.tenantId;
    } else {
      tenantId = input?.tenantId;
    }

    if (!tenantId) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Tenant ID is required',
      });
    }

    if (!ctx.userId) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'User ID is required',
      });
    }

    // Verify user is broker or admin in this tenant
    const isBroker = await verifyTenantBroker(ctx.userId, tenantId);
    if (!isBroker) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You must be a broker to perform this action',
      });
    }

    return next({
      ctx: {
        ...ctx,
        tenantId,
      },
    });
  };
}
