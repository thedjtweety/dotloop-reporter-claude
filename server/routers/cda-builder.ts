import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import { getDb } from '../db';
import { cdaDocuments } from '../../drizzle/schema';
import { storagePut } from '../storage';
import { TRPCError } from '@trpc/server';
import { generateCdaPdf } from '../services/cda-pdf-generator';
import { eq, desc } from 'drizzle-orm';
import { getTenantIdFromUser } from '../lib/tenant-utils';

export const cdaBuilderRouter = router({
  // Generate and save CDA PDF
  generatePdf: protectedProcedure
    .input(
      z.object({
        formData: z.object({
          titleCompany: z.string(),
          closerName: z.string(),
          phone: z.string(),
          email: z.string(),
          fileNumber: z.string(),
          transactionType: z.string(),
          propertyAddress: z.string(),
          city: z.string(),
          state: z.string(),
          zipCode: z.string(),
          county: z.string(),
          mlsNumber: z.string(),
          salePrice: z.number(),
          closingDate: z.string(),
          contractDate: z.string(),
          buyerName: z.string(),
          sellerName: z.string(),
          totalCommissionRate: z.number(),
          listingSide: z.number(),
          buyingSide: z.number(),
          referralFee: z.number(),
          referralAppliesto: z.string(),
          franchiseFee: z.number(),
          listingAgentSplit: z.number(),
          buyingAgentSplit: z.number(),
          disbursementInstructions: z.string(),
          notes: z.string(),
        }),
        agents: z.array(
          z.object({
            role: z.string(),
            name: z.string(),
            legalEntity: z.string(),
            company: z.string(),
            licenseNumber: z.string(),
            tinSsn: z.string(),
            phone: z.string(),
            email: z.string(),
          })
        ),
        deductions: z.array(
          z.object({
            id: z.string(),
            description: z.string(),
            amount: z.number(),
            side: z.string(),
            type: z.string(),
          })
        ),
        waterfall: z.object({
          gci: z.number(),
          listingSide: z.number(),
          buyingSide: z.number(),
          referralAmount: z.number(),
          franchiseAmount: z.number(),
          listingAgentGross: z.number(),
          listingBrokerGross: z.number(),
          buyingAgentGross: z.number(),
          buyingBrokerGross: z.number(),
          totalDeductions: z.number(),
          listingAgentNet: z.number(),
          buyingAgentNet: z.number(),
        }),
        branding: z.object({
          brokerageName: z.string(),
          tagline: z.string().optional(),
          logoUrl: z.string().optional(),
          primaryColor: z.string(),
          secondaryColor: z.string(),
          accentColor: z.string(),
        }).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        if (!ctx.user?.id) throw new TRPCError({ code: 'UNAUTHORIZED' });
        const db = await getDb();
        if (!db) throw new Error('Database not available');
        
        const tenantId = await getTenantIdFromUser(ctx.user.id);

        // Generate PDF
        const pdfBuffer = await generateCdaPdf(input.formData, input.agents, input.waterfall, input.branding);

        // Upload to S3
        const fileName = `cda-${tenantId}-${Date.now()}.pdf`;
        const { url } = await storagePut(
          `cda-documents/${fileName}`,
          pdfBuffer,
          'application/pdf'
        );

        // Save CDA document record
        const cdaId = `cda-${ctx.user.id}-${Date.now()}`;
        await db.insert(cdaDocuments).values({
          id: cdaId,
          tenantId: tenantId,
          documentName: `${input.formData.propertyAddress} - ${input.formData.closingDate}`,
          description: `CDA for ${input.formData.buyerName} / ${input.formData.sellerName}`,
          closingCompany: input.formData.titleCompany,
          closingOfficer: input.formData.closerName,
          propertyAddress: input.formData.propertyAddress,
          salePrice: input.formData.salePrice.toString(),
          closingDate: input.formData.closingDate,
          totalCommissionRate: input.formData.totalCommissionRate.toString(),
          listingSide: input.formData.listingSide.toString(),
          buyingSide: input.formData.buyingSide.toString(),
          referralFee: input.formData.referralFee.toString(),
          franchiseFee: input.formData.franchiseFee.toString(),
          listingAgentSplit: input.formData.listingAgentSplit.toString(),
          buyingAgentSplit: input.formData.buyingAgentSplit.toString(),
          agentsData: JSON.stringify(input.agents),
          deductions: JSON.stringify(input.deductions),
          disbursementInstructions: input.formData.disbursementInstructions,
          pdfUrl: url,
          pdfFileName: fileName,
          status: 'generated',
          createdBy: tenantId,
        });

        return { url, cdaId, fileName };
      } catch (error) {
        console.error('Error generating CDA PDF:', error);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to generate CDA PDF' });
      }
    }),

  // Get CDA documents
  getCDADocuments: protectedProcedure.query(async ({ ctx }) => {
    try {
      if (!ctx.user?.id) throw new TRPCError({ code: 'UNAUTHORIZED' });
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      
      const tenantId = await getTenantIdFromUser(ctx.user.id);
      
      const documents = await db.select().from(cdaDocuments).where(eq(cdaDocuments.tenantId, tenantId)).orderBy((t) => t.createdAt).limit(100);
      return documents;
    } catch (error) {
      console.error('Error fetching CDA documents:', error);
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch CDA documents' });
    }
  }),

  // Delete CDA document
  deleteCDADocument: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        if (!ctx.user?.id) throw new TRPCError({ code: 'UNAUTHORIZED' });
        const db = await getDb();
        if (!db) throw new Error('Database not available');
        
        const tenantId = await getTenantIdFromUser(ctx.user.id);

        const docs = await db.select().from(cdaDocuments).where(eq(cdaDocuments.id, input.id)).limit(1);
        const doc = docs.find(d => d.tenantId === tenantId);
        if (!doc) throw new TRPCError({ code: 'NOT_FOUND', message: 'Document not found' });

        await db.delete(cdaDocuments).where(eq(cdaDocuments.id, input.id));
        return { success: true };
      } catch (error) {
        console.error('Error deleting CDA document:', error);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to delete CDA document' });
      }
    }),

  // Download CDA document
  downloadCDADocument: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        if (!ctx.user?.id) throw new TRPCError({ code: 'UNAUTHORIZED' });
        const db = await getDb();
        if (!db) throw new Error('Database not available');
        
        const tenantId = await getTenantIdFromUser(ctx.user.id);

        const docs = await db.select().from(cdaDocuments).where(eq(cdaDocuments.id, input.id)).limit(1);
        const doc = docs.find(d => d.tenantId === tenantId);
        if (!doc) throw new TRPCError({ code: 'NOT_FOUND', message: 'Document not found' });

        if (!doc.pdfUrl) throw new TRPCError({ code: 'NOT_FOUND', message: 'Document not found' });

        return { pdfUrl: doc.pdfUrl };
      } catch (error) {
        console.error('Error downloading CDA document:', error);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to download CDA document' });
      }
    }),
});
