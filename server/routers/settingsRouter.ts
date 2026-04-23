// @ts-nocheck
import { protectedProcedure, router } from '../_core/trpc';
import { z } from 'zod';
import { getDb } from '../db';
import { tenantSettings, uploads } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { getTenantContext } from '../lib/tenant-middleware';
import { logAuditEvent } from '../lib/audit-logger';
import { storagePut } from '../storage';

export const settingsRouter = router({
  uploadLogo: protectedProcedure
    .input(z.object({ file: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const tenant = await getTenantContext(ctx);
      if (!tenant || !tenant.tenantId) throw new Error('Tenant not found');
      const tenantId = tenant.tenantId;
      
        // Upload file to S3
      const { url } = await storagePut(
        `${tenantId}/logo-${Date.now()}.png`,
        Buffer.from(input.file, 'base64'),
        'image/png'
      );
      
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');
      
      await db.update(tenantSettings)
        .set({ logoUrl: url, updatedAt: new Date() })
        .where(eq(tenantSettings.tenantId, tenantId));

      // Log audit event
      await logAuditEvent({
        tenantId,
        adminId: parseInt(ctx.user.id),
        adminName: ctx.user.name || 'Unknown',
        adminEmail: ctx.user.email || undefined,
        action: 'settings_changed',
        targetType: 'system',
        targetId: tenantId,
        details: JSON.stringify({ field: 'logoUrl', url })
      });

      return { url };
    }),

  updateColorScheme: protectedProcedure
    .input(z.object({ scheme: z.enum(['light', 'dark', 'auto']) }))
    .mutation(async ({ ctx, input }) => {
      const tenant = await getTenantContext(ctx);
      if (!tenant || !tenant.tenantId) throw new Error('Tenant not found');
      const tenantId = tenant.tenantId;

      await db.update(tenantSettings)
        .set({ colorScheme: input.scheme, updatedAt: new Date() })
        .where(eq(tenantSettings.tenantId, tenantId));

      await logAuditEvent({
        tenantId,
        adminId: parseInt(ctx.user.id),
        adminName: ctx.user.name || 'Unknown',
        adminEmail: ctx.user.email || undefined,
        action: 'settings_changed',
        targetType: 'system',
        targetId: tenantId,
        details: JSON.stringify({ field: 'colorScheme', value: input.scheme })
      });

      return { success: true };
    }),

  updateDataRetention: protectedProcedure
    .input(z.object({ days: z.number().min(0) }))
    .mutation(async ({ ctx, input }) => {
      const tenant = await getTenantContext(ctx);
      if (!tenant || !tenant.tenantId) throw new Error('Tenant not found');
      const tenantId = tenant.tenantId;

      await db.update(tenantSettings)
        .set({ dataRetentionDays: input.days, updatedAt: new Date() })
        .where(eq(tenantSettings.tenantId, tenantId));

      await logAuditEvent({
        tenantId,
        adminId: parseInt(ctx.user.id),
        adminName: ctx.user.name || 'Unknown',
        adminEmail: ctx.user.email || undefined,
        action: 'settings_changed',
        targetType: 'system',
        targetId: tenantId,
        details: JSON.stringify({ field: 'dataRetentionDays', value: input.days })
      });

      return { success: true };
    }),

  exportData: protectedProcedure
    .query(async ({ ctx }) => {
      const tenant = await getTenantContext(ctx);
      if (!tenant || !tenant.tenantId) throw new Error('Tenant not found');
      const tenantId = tenant.tenantId;

      // Fetch all tenant data
      const uploadedData = await db.select()
        .from(uploads)
        .where(eq(uploads.tenantId, tenantId));

      await logAuditEvent({
        tenantId,
        adminId: parseInt(ctx.user.id),
        adminName: ctx.user.name || 'Unknown',
        adminEmail: ctx.user.email || undefined,
        action: 'data_exported',
        targetType: 'system',
        targetId: tenantId,
        details: JSON.stringify({ recordCount: uploadedData.length })
      });

      return {
        exportedAt: new Date(),
        recordCount: uploadedData.length,
        data: uploadedData
      };
    }),

  resetData: protectedProcedure
    .mutation(async ({ ctx }) => {
      const tenant = await getTenantContext(ctx);
      if (!tenant || !tenant.tenantId) throw new Error('Tenant not found');
      const tenantId = tenant.tenantId;

      // Delete all tenant data
      await db.delete(uploads)
        .where(eq(uploads.tenantId, tenantId));

      await logAuditEvent({
        tenantId,
        adminId: parseInt(ctx.user.id),
        adminName: ctx.user.name || 'Unknown',
        adminEmail: ctx.user.email || undefined,
        action: 'settings_changed',
        targetType: 'system',
        targetId: tenantId,
        details: JSON.stringify({ action: 'RESET_ALL_DATA' })
      });

      return { success: true };
    }),

  getSettings: protectedProcedure
    .query(async ({ ctx }) => {
      const tenant = await getTenantContext(ctx);
      if (!tenant || !tenant.tenantId) throw new Error('Tenant not found');
      const tenantId = tenant.tenantId;

      const settings = await db.select()
        .from(tenantSettings)
        .where(eq(tenantSettings.tenantId, tenantId))
        .limit(1);

      return settings[0] || null;
    })
});
