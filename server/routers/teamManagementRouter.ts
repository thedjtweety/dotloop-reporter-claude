/**
 * Team Management Router - Phase 5: Team & Admin Features (5.1-5.4)
 * Handles team member management, role assignment, permissions, and admin dashboard
 */

import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import { TRPCError } from '@trpc/server';
import { tenantMembers, users, auditLogs } from '../../drizzle/schema';
import { getDb } from '../db';
import { eq, and } from 'drizzle-orm';
import { logAuditEvent } from '../lib/audit-logger';

export interface TeamMember {
  id: number;
  tenantId: number;
  userId: number;
  role: 'admin' | 'broker' | 'member' | 'agent';
  permissions: string[];
  joinedAt: string;
  lastActive: string;
}

export interface AdminDashboardStats {
  totalUsers: number;
  totalTransactions: number;
  totalVolume: number;
  totalCommission: number;
  activeUsers: number;
  recentActivity: any[];
  teamMembers: TeamMember[];
}

const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ['manage_team', 'manage_settings', 'view_all_reports', 'manage_commission_plans', 'view_audit_logs', 'manage_integrations'],
  broker: ['manage_agents', 'view_all_reports', 'manage_commission_plans', 'view_audit_logs'],
  member: ['view_reports', 'manage_uploads', 'view_own_metrics'],
  agent: ['view_own_metrics', 'view_own_performance'],
};

export const teamManagementRouter = router({
  /**
   * Priority 5.1: Get team members
   */
  getTeamMembers: protectedProcedure.query(async ({ ctx }) => {
    try {
      const tenantId = ctx.user.id as number;
      if (!tenantId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'No tenant context',
        });
      }

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database connection failed',
        });
      }

      const members = await db
        .select()
        .from(tenantMembers)
        .where(eq(tenantMembers.tenantId, tenantId));

      return members.map((m) => ({
        id: m.id,
        tenantId: m.tenantId,
        userId: m.userId,
        role: m.role,
        permissions: m.permissions ? JSON.parse(m.permissions) : ROLE_PERMISSIONS[m.role] || [],
        joinedAt: m.joinedAt,
        lastActive: m.updatedAt,
      }));
    } catch (error) {
      console.error('Get team members error:', error);
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch team members',
      });
    }
  }),

  /**
   * Priority 5.1: Invite team member
   */
  inviteTeamMember: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        role: z.enum(['admin', 'broker', 'member', 'agent']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const tenantId = ctx.user.id as number;
        if (!tenantId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'No tenant context',
          });
        }

        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Database connection failed',
          });
        }

        // Check if member already exists
        const existing = await db
          .select()
          .from(tenantMembers)
          .where(
            and(
              eq(tenantMembers.tenantId, tenantId),
              eq(tenantMembers.userId, input.userId)
            )
          );

        if (existing.length > 0) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Member already exists',
          });
        }

        // Create invitation
        const result = await db.insert(tenantMembers).values({
          tenantId,
          userId: input.userId,
          role: input.role,
          status: 'invited',
          invitedBy: typeof ctx.user.id === 'string' ? parseInt(ctx.user.id) : (ctx.user.id as any),
          invitedAt: new Date().toISOString(),
        } as any);

        // Log audit event
        await logAuditEvent({
          tenantId,
          adminId: ctx.user.id as number,
          adminName: ctx.user.email || 'Unknown',
          action: 'user_role_changed',
          targetType: 'user',
          targetName: `User ${input.userId}`,
          details: `Invited as ${input.role}`,
        });

        return {
          success: true,
          memberId: result[0],
          message: `Member invited with ${input.role} role`,
        };
      } catch (error) {
        console.error('Invite team member error:', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to invite team member',
        });
      }
    }),

  /**
   * Priority 5.2: Update team member role
   */
  updateMemberRole: protectedProcedure
    .input(
      z.object({
        memberId: z.number(),
        role: z.enum(['admin', 'broker', 'member', 'agent']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const tenantId = ctx.user.id as number;
        if (!tenantId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'No tenant context',
          });
        }

        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Database connection failed',
          });
        }

        // Verify member belongs to tenant
        const member = await db
          .select()
          .from(tenantMembers)
          .where(
            and(
              eq(tenantMembers.tenantId, tenantId),
              eq(tenantMembers.id, parseInt(input.memberId.toString()))
            )
          );

        if (member.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Team member not found',
          });
        }

        // Update role
        await db
          .update(tenantMembers)
          .set({ role: input.role })
          .where(eq(tenantMembers.id, parseInt(input.memberId.toString())));

        // Log audit event
        await logAuditEvent({
          tenantId,
          adminId: ctx.user.id as number,
          adminName: ctx.user.email || 'Unknown',
          action: 'user_role_changed',
          targetType: 'user',
          targetName: `User ${member[0].userId}`,
          details: `Role changed to ${input.role}`,
        });

        return { success: true };
      } catch (error) {
        console.error('Update member role error:', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update member role',
        });
      }
    }),

  /**
   * Priority 5.2: Remove team member
   */
  removeTeamMember: protectedProcedure
    .input(z.object({ memberId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const tenantId = ctx.user.id as number;
        if (!tenantId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'No tenant context',
          });
        }

        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Database connection failed',
          });
        }

        // Verify member belongs to tenant
        const member = await db
          .select()
          .from(tenantMembers)
          .where(
            and(
              eq(tenantMembers.tenantId, tenantId),
              eq(tenantMembers.id, parseInt(input.memberId.toString()))
            )
          );

        if (member.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Team member not found',
          });
        }

        // Delete member
        await db
          .delete(tenantMembers)
          .where(eq(tenantMembers.id, parseInt(input.memberId.toString())));

        // Log audit event
        await logAuditEvent({
          tenantId,
          adminId: ctx.user.id as number,
          adminName: ctx.user.email || 'Unknown',
          action: 'user_role_changed',
          targetType: 'user',
          targetName: `User ${member[0].userId}`,
          details: 'Removed from team',
        });

        return { success: true };
      } catch (error) {
        console.error('Remove team member error:', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to remove team member',
        });
      }
    }),

  /**
   * Priority 5.3: Get admin dashboard stats
   */
  getAdminDashboardStats: protectedProcedure.query(async ({ ctx }) => {
    try {
      const tenantId = ctx.user.id as number;
      if (!tenantId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'No tenant context',
        });
      }

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database connection failed',
        });
      }

      // Get team members
      const members = await db
        .select()
        .from(tenantMembers)
        .where(eq(tenantMembers.tenantId, tenantId));

      // Get recent audit logs
      const logs = await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.tenantId, tenantId));

      return {
        totalUsers: members.length,
        totalTransactions: 0,
        totalVolume: 0,
        totalCommission: 0,
        activeUsers: members.filter((m) => {
          const lastActive = new Date(m.updatedAt);
          const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          return lastActive > dayAgo;
        }).length,
        recentActivity: logs.slice(-10).map((log) => ({
          action: log.action,
          user: log.adminName,
          target: log.targetName,
          timestamp: log.createdAt,
        })),
        teamMembers: members.map((m) => ({
          id: m.id,
          tenantId: m.tenantId,
          userId: m.userId,
          role: m.role,
          permissions: m.permissions ? JSON.parse(m.permissions) : ROLE_PERMISSIONS[m.role] || [],
          joinedAt: m.joinedAt,
          lastActive: m.updatedAt,
        })),
      };
    } catch (error) {
      console.error('Get admin dashboard stats error:', error);
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch admin dashboard stats',
      });
    }
  }),

  /**
   * Priority 5.4: Get role permissions
   */
  getRolePermissions: protectedProcedure.query(async () => {
    return ROLE_PERMISSIONS;
  }),
});
