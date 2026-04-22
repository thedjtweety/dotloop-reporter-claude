/**
 * Role-Based Access Control (RBAC) Middleware
 * Enforces role-based access to procedures
 */

import { TRPCError } from '@trpc/server';
import { getDb } from '../db';
import { tenantMembers } from '../../drizzle/schema';
import { eq, and } from 'drizzle-orm';

export type UserRole = 'admin' | 'broker' | 'member' | 'agent';

/**
 * Get user's role in a tenant
 */
export async function getUserRole(userId: number, tenantId: number): Promise<UserRole | null> {
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
      return null;
    }

    return membership[0].role as UserRole;
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
}

/**
 * Check if user has required role
 */
export async function hasRole(
  userId: number,
  tenantId: number,
  requiredRoles: UserRole[]
): Promise<boolean> {
  const role = await getUserRole(userId, tenantId);
  return role ? requiredRoles.includes(role) : false;
}

/**
 * Check if user is admin
 */
export async function isAdmin(userId: number, tenantId: number): Promise<boolean> {
  return hasRole(userId, tenantId, ['admin']);
}

/**
 * Check if user is broker or admin
 */
export async function isBrokerOrAdmin(userId: number, tenantId: number): Promise<boolean> {
  return hasRole(userId, tenantId, ['admin', 'broker']);
}

/**
 * Check if user is member or higher
 */
export async function isMemberOrHigher(userId: number, tenantId: number): Promise<boolean> {
  return hasRole(userId, tenantId, ['admin', 'broker', 'member']);
}

/**
 * Middleware factory for requiring specific roles
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return async (opts: any) => {
    const { ctx, input, next } = opts;

    if (!ctx.userId) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'User ID is required',
      });
    }

    if (!ctx.tenantId) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Tenant ID is required',
      });
    }

    const userRole = await getUserRole(ctx.userId, ctx.tenantId);

    if (!userRole || !allowedRoles.includes(userRole)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `This action requires one of the following roles: ${allowedRoles.join(', ')}. You have role: ${userRole || 'none'}`,
      });
    }

    return next({
      ctx: {
        ...ctx,
        userRole,
      },
    });
  };
}

/**
 * Middleware factory for admin-only access
 */
export function requireAdmin() {
  return requireRole('admin');
}

/**
 * Middleware factory for broker-or-admin access
 */
export function requireBrokerOrAdmin() {
  return requireRole('admin', 'broker');
}

/**
 * Middleware factory for member-or-higher access
 */
export function requireMemberOrHigher() {
  return requireRole('admin', 'broker', 'member');
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role: UserRole): string {
  const names: Record<UserRole, string> = {
    admin: 'Administrator',
    broker: 'Broker',
    member: 'Team Member',
    agent: 'Agent',
  };
  return names[role];
}

/**
 * Get role permissions
 */
export function getRolePermissions(role: UserRole): string[] {
  const permissions: Record<UserRole, string[]> = {
    admin: [
      'manage_users',
      'manage_roles',
      'manage_teams',
      'manage_commission_plans',
      'manage_settings',
      'view_audit_logs',
      'export_data',
      'manage_webhooks',
      'manage_alerts',
    ],
    broker: [
      'manage_agents',
      'view_commissions',
      'manage_commission_plans',
      'view_audit_logs',
      'export_data',
      'manage_alerts',
    ],
    member: [
      'view_dashboards',
      'view_agents',
      'view_commissions',
      'export_data',
    ],
    agent: [
      'view_own_stats',
      'view_own_commissions',
    ],
  };
  return permissions[role];
}

/**
 * Check if role has permission
 */
export function roleHasPermission(role: UserRole, permission: string): boolean {
  const permissions = getRolePermissions(role);
  return permissions.includes(permission);
}
