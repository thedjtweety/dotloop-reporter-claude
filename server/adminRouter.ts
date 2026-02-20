import { protectedProcedure, protectedProcedureWithErrorHandling, router } from './_core/trpc';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { getDb } from './db';
import { users, uploads, auditLogs } from '../drizzle/schema';
import { deleteUpload } from './uploadDb';
import { eq, desc, sql } from 'drizzle-orm';

/**
 * Admin-only middleware with error handling
 * Ensures the user has admin role before allowing access to admin endpoints
 */
const adminProcedure = protectedProcedureWithErrorHandling.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Admin access required',
    });
  }
  return next({ ctx });
});

export const adminRouter = router({
  /**
   * Get system statistics
   */
  getStats: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

    const [userStats] = await db
      .select({
        totalUsers: sql<number>`COUNT(*)`,
        adminUsers: sql<number>`SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END)`,
        regularUsers: sql<number>`SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END)`,
      })
      .from(users);

    const [uploadStats] = await db
      .select({
        totalUploads: sql<number>`COUNT(*)`,
        totalRecords: sql<number>`SUM(recordCount)`,
      })
      .from(uploads);

    return {
      users: {
        total: Number(userStats?.totalUsers || 0),
        admins: Number(userStats?.adminUsers || 0),
        regular: Number(userStats?.regularUsers || 0),
      },
      uploads: {
        total: Number(uploadStats?.totalUploads || 0),
        totalRecords: Number(uploadStats?.totalRecords || 0),
      },
    };
  }),

  /**
   * List all users with their upload counts
   */
  listUsers: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

      const usersWithUploads = await db
        .select({
          id: users.id,
          openId: users.openId,
          name: users.name,
          email: users.email,
          role: users.role,
          createdAt: users.createdAt,
          lastSignedIn: users.lastSignedIn,
          uploadCount: sql<number>`COUNT(${uploads.id})`,
        })
        .from(users)
        .leftJoin(uploads, eq(users.id, uploads.userId))
        .groupBy(users.id)
        .orderBy(desc(users.lastSignedIn))
        .limit(input.limit)
        .offset(input.offset);

      return usersWithUploads.map((u) => ({
        ...u,
        uploadCount: Number(u.uploadCount),
      }));
    }),

  /**
   * Get all uploads across all users
   */
  listAllUploads: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

      const allUploads = await db
        .select({
          id: uploads.id,
          fileName: uploads.fileName,
          recordCount: uploads.recordCount,
          uploadedAt: uploads.uploadedAt,
          userId: uploads.userId,
          userName: users.name,
          userEmail: users.email,
        })
        .from(uploads)
        .leftJoin(users, eq(uploads.userId, users.id))
        .orderBy(desc(uploads.uploadedAt))
        .limit(input.limit)
        .offset(input.offset);

      return allUploads;
    }),

  /**
   * Delete an upload (admin can delete any upload)
   */
  deleteUpload: adminProcedure
    .input(
      z.object({
        uploadId: z.number(),
        userId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await deleteUpload(input.uploadId, input.userId, true, ctx.user);
      return { success: true };
    }),

  /**
   * Update user role (promote/demote admin)
   */
  updateUserRole: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        role: z.enum(['admin', 'broker', 'agent', 'viewer']),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

      // Get user info before update for audit log
      const userToUpdate = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
      const userName = userToUpdate[0]?.name || 'Unknown User';
      const oldRole = userToUpdate[0]?.role || 'viewer';

      await db
        .update(users)
        .set({ role: input.role })
        .where(eq(users.id, input.userId));

      // Log the action
      const { getTenantIdFromUser } = await import('./lib/tenant-context');
      const tenantId = await getTenantIdFromUser(ctx.user.id);
      
      await db.insert(auditLogs).values({
        tenantId,
        adminId: ctx.user.id,
        adminName: ctx.user.name || 'Unknown Admin',
        adminEmail: ctx.user.email || undefined,
        action: 'user_role_changed',
        targetType: 'user',
        targetId: input.userId,
        targetName: userName,
        details: JSON.stringify({ oldRole, newRole: input.role, changedBy: ctx.user.id }),
      });

      return { success: true };
    }),

  /**
   * Delete a user and all their uploads
   */
  deleteUser: adminProcedure
    .input(
      z.object({
        userId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

      // Prevent self-deletion
      if (input.userId === ctx.user.id) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot delete your own account',
        });
      }

      // Get user info before deletion for audit log
      const userToDelete = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
      const userName = userToDelete[0]?.name || 'Unknown User';

      // Delete user's uploads first (cascade will handle transactions)
      await db.delete(uploads).where(eq(uploads.userId, input.userId));

      // Delete user
      await db.delete(users).where(eq(users.id, input.userId));

      // Log the action
      const { getTenantIdFromUser: getTenantId2 } = await import('./lib/tenant-context');
      const tenantId2 = await getTenantId2(ctx.user.id);
      
      await db.insert(auditLogs).values({
        tenantId: tenantId2,
        adminId: ctx.user.id,
        adminName: ctx.user.name || 'Unknown Admin',
        adminEmail: ctx.user.email || undefined,
        action: 'user_deleted',
        targetType: 'user',
        targetId: input.userId,
        targetName: userName,
        details: JSON.stringify({ deletedBy: ctx.user.id }),
      });

      return { success: true };
    }),
});
