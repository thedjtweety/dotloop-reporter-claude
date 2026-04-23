// @ts-nocheck
import { protectedProcedure, router } from '../_core/trpc';
import { z } from 'zod';
import { getDb } from '../db';
import { brokerageBranding, uploads } from '../../drizzle/schema';
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
      
      // Update or create branding record
      const existing = await db.select()
        .from(brokerageBranding)
        .where(eq(brokerageBranding.tenantId, tenantId))
        .limit(1);
      
      if (existing.length > 0) {
        await db.update(brokerageBranding)
          .set({ logoUrl: url, updatedAt: new Date() })
          .where(eq(brokerageBranding.tenantId, tenantId));
      } else {
        await db.insert(brokerageBranding).values({
          tenantId,
          logoUrl: url,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }

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

  getSettings: protectedProcedure
    .query(async ({ ctx }) => {
      const tenant = await getTenantContext(ctx);
      if (!tenant || !tenant.tenantId) throw new Error('Tenant not found');
      const tenantId = tenant.tenantId;

      const db = await getDb();
      if (!db) throw new Error('Database connection failed');

      const branding = await db.select()
        .from(brokerageBranding)
        .where(eq(brokerageBranding.tenantId, tenantId))
        .limit(1);

      return branding[0] || { tenantId, logoUrl: null, colorScheme: 'default' };
    }),

  updateColorScheme: protectedProcedure
    .input(z.object({ colorScheme: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const tenant = await getTenantContext(ctx);
      if (!tenant || !tenant.tenantId) throw new Error('Tenant not found');
      const tenantId = tenant.tenantId;

      const db = await getDb();
      if (!db) throw new Error('Database connection failed');

      const existing = await db.select()
        .from(brokerageBranding)
        .where(eq(brokerageBranding.tenantId, tenantId))
        .limit(1);
      
      if (existing.length > 0) {
        await db.update(brokerageBranding)
          .set({ colorScheme: input.colorScheme, updatedAt: new Date() })
          .where(eq(brokerageBranding.tenantId, tenantId));
      } else {
        await db.insert(brokerageBranding).values({
          tenantId,
          colorScheme: input.colorScheme,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }

      await logAuditEvent({
        tenantId,
        adminId: parseInt(ctx.user.id),
        adminName: ctx.user.name || 'Unknown',
        adminEmail: ctx.user.email || undefined,
        action: 'settings_changed',
        targetType: 'system',
        targetId: tenantId,
        details: JSON.stringify({ field: 'colorScheme', value: input.colorScheme })
      });

      return { success: true };
    }),

  exportData: protectedProcedure
    .query(async ({ ctx }) => {
      const tenant = await getTenantContext(ctx);
      if (!tenant || !tenant.tenantId) throw new Error('Tenant not found');
      const tenantId = tenant.tenantId;

      const db = await getDb();
      if (!db) throw new Error('Database connection failed');

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

  resetAllData: protectedProcedure
    .mutation(async ({ ctx }) => {
      const tenant = await getTenantContext(ctx);
      if (!tenant || !tenant.tenantId) throw new Error('Tenant not found');
      const tenantId = tenant.tenantId;

      const db = await getDb();
      if (!db) throw new Error('Database connection failed');

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
    })
});
