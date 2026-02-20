/**
 * RBAC Middleware for tRPC Procedures
 * 
 * Provides middleware functions to enforce role-based access control
 * on tRPC procedures.
 */

import { TRPCError } from '@trpc/server';
import type { TrpcContext } from '../_core/context';
import { hasPermission, type Permission, type UserRole } from '../lib/permissions';

/**
 * Middleware to require a specific permission
 */
export function requirePermission(permission: Permission) {
  return async ({ ctx, next }: { ctx: TrpcContext; next: () => Promise<any> }) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to perform this action',
      });
    }

    const userRole = ctx.user.role as UserRole;
    if (!hasPermission(userRole, permission)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `You do not have permission to perform this action (required: ${permission})`,
      });
    }

    return next();
  };
}

/**
 * Middleware to require any of the specified permissions
 */
export function requireAnyPermission(permissions: Permission[]) {
  return async ({ ctx, next }: { ctx: TrpcContext; next: () => Promise<any> }) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to perform this action',
      });
    }

    const userRole = ctx.user.role as UserRole;
    const hasAny = permissions.some(p => hasPermission(userRole, p));
    
    if (!hasAny) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `You do not have permission to perform this action (required: one of ${permissions.join(', ')})`,
      });
    }

    return next();
  };
}

/**
 * Middleware to require all of the specified permissions
 */
export function requireAllPermissions(permissions: Permission[]) {
  return async ({ ctx, next }: { ctx: TrpcContext; next: () => Promise<any> }) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to perform this action',
      });
    }

    const userRole = ctx.user.role as UserRole;
    const hasAll = permissions.every(p => hasPermission(userRole, p));
    
    if (!hasAll) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `You do not have permission to perform this action (required: ${permissions.join(', ')})`,
      });
    }

    return next();
  };
}

/**
 * Middleware to require a specific role or higher
 */
export function requireRole(role: UserRole) {
  return async ({ ctx, next }: { ctx: TrpcContext; next: () => Promise<any> }) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to perform this action',
      });
    }

    const userRole = ctx.user.role as UserRole;
    const roleHierarchy: Record<UserRole, number> = {
      viewer: 1,
      agent: 2,
      broker: 3,
      admin: 4,
    };

    if (roleHierarchy[userRole] < roleHierarchy[role]) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `You must be at least a ${role} to perform this action`,
      });
    }

    return next();
  };
}

/**
 * Middleware to require admin role
 */
export const requireAdmin = requireRole('admin');

/**
 * Middleware to require broker role or higher
 */
export const requireBroker = requireRole('broker');

/**
 * Middleware to require agent role or higher
 */
export const requireAgent = requireRole('agent');
