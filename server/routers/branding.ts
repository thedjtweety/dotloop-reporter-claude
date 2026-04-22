import { z } from 'zod';
import { protectedProcedure, publicProcedure, router } from '../_core/trpc';
import { getDb } from '../db';
import { brokerageBranding } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { storagePut } from '../storage';
import { TRPCError } from '@trpc/server';
import { getTenantIdFromUser } from '../lib/tenant-utils';

export const brandingRouter = router({
  // Get branding for current tenant
  getBranding: protectedProcedure.query(async ({ ctx }) => {
    try {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      if (!ctx.user?.id) throw new TRPCError({ code: 'UNAUTHORIZED' });
      const tenantId = await getTenantIdFromUser(ctx.user.id);
      
      const brandingResults = await db.select().from(brokerageBranding).where(eq(brokerageBranding.tenantId, tenantId)).limit(1);
      const branding = brandingResults[0] || null;

      return branding || null;
    } catch (error) {
      console.error('Error fetching branding:', error);
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch branding' });
    }
  }),

  // Update branding settings
  updateBranding: protectedProcedure
    .input(
      z.object({
        brokerageName: z.string().min(1, 'Brokerage name is required'),
        tagline: z.string().optional(),
        address: z.string().optional(),
        phone: z.string().optional(),
        licenseNumber: z.string().optional(),
        primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format'),
        secondaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format'),
        accentColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        if (!ctx.user?.id) throw new TRPCError({ code: 'UNAUTHORIZED' });
        const tenantId = await getTenantIdFromUser(ctx.user.id);
        
        // Check if branding exists for this tenant
        const existingResults = await db.select().from(brokerageBranding).where(eq(brokerageBranding.tenantId, tenantId)).limit(1);
        const existing = existingResults[0] || null;

        if (existing) {
          // Update existing
          await db
            .update(brokerageBranding)
            .set({
              ...input,
              updatedAt: new Date().toISOString(),
            })
            .where(eq(brokerageBranding.tenantId, tenantId));
        } else {
          // Create new
          await db.insert(brokerageBranding).values({
            tenantId: tenantId,
            ...input,
          });
        }

        return { success: true };
      } catch (error) {
        console.error('Error updating branding:', error);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update branding' });
      }
    }),

  // Upload logo
  uploadLogo: protectedProcedure
    .input(
      z.object({
        file: z.instanceof(File),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        if (!ctx.user?.id) throw new TRPCError({ code: 'UNAUTHORIZED' });
        const db = await getDb();
        if (!db) throw new Error('Database not available');
        
        const tenantId = await getTenantIdFromUser(ctx.user.id);

        const buffer = await input.file.arrayBuffer();
        const fileName = `branding-logo-${tenantId}-${Date.now()}.${input.file.name.split('.').pop()}`;

        // Upload to S3
        const { url } = await storagePut(
          `branding/${fileName}`,
          Buffer.from(buffer),
          input.file.type
        );

        // Update branding with logo URL
        const existingResults = await db.select().from(brokerageBranding).where(eq(brokerageBranding.tenantId, tenantId)).limit(1);
        const existing = existingResults[0] || null;

        if (existing) {
          await db
            .update(brokerageBranding)
            .set({
              logoUrl: url,
              logoFileName: fileName,
              updatedAt: new Date().toISOString(),
            })
            .where(eq(brokerageBranding.tenantId, tenantId));
        } else {
          await db.insert(brokerageBranding).values({
            tenantId: tenantId,
            brokerageName: 'My Brokerage',
            logoUrl: url,
            logoFileName: fileName,
          });
        }

        return { url, fileName };
      } catch (error) {
        console.error('Error uploading logo:', error);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to upload logo' });
      }
    }),
});
