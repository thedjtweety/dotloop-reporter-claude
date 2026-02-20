import { describe, it, expect } from 'vitest';
import { appRouter } from '../routers';
import type { TrpcContext } from '../_core/context';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

// Mock context (no auth required for public procedures)
function createMockContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: 'https',
      headers: {},
    } as TrpcContext['req'],
    res: {} as TrpcContext['res'],
  };
}

describe('CDA Router - PDF Generation', () => {
  const ctx = createMockContext();
  const caller = appRouter.createCaller(ctx);

  describe('calculate endpoint', () => {
    it('should calculate CDA for basic transaction', async () => {
      const input = {
        propertyAddress: '123 Main St, Austin, TX 78701',
        salePrice: 500000,
        totalCommissionRate: 6.0,
        sellingSplitPercent: 50,
        listingSplitPercent: 50,
        sellingAgent1Name: 'John Smith',
        sellingAgent1SplitPercent: 80,
        sellingBrokerSplitPercent: 20,
        sellingOtherAdjustments: [],
        listingAgent1Name: 'Jane Doe',
        listingAgent1SplitPercent: 80,
        listingBrokerSplitPercent: 20,
        listingOtherAdjustments: [],
      };

      const result = await caller.cda.calculate(input);

      expect(result.grossCommission).toBe(30000);
      expect(result.sellingGrossCommission).toBe(15000);
      expect(result.listingGrossCommission).toBe(15000);
      expect(result.sellingAgent1Commission).toBe(12000);
      expect(result.sellingBrokerageCommission).toBe(3000);
      expect(result.listingAgent1Commission).toBe(12000);
      expect(result.listingBrokerageCommission).toBe(3000);
      expect(result.isValid).toBe(true);
      expect(result.validationErrors).toHaveLength(0);
    });

    it('should calculate CDA with referral fee', async () => {
      const input = {
        propertyAddress: '456 Oak Ave, Dallas, TX 75201',
        salePrice: 750000,
        totalCommissionRate: 5.0,
        sellingSplitPercent: 50,
        listingSplitPercent: 50,
        sellingAgent1Name: 'Alice Johnson',
        sellingAgent1SplitPercent: 75,
        sellingBrokerSplitPercent: 25,
        sellingOtherAdjustments: [],
        listingAgent1Name: 'Bob Williams',
        listingAgent1SplitPercent: 75,
        listingBrokerSplitPercent: 25,
        listingOtherAdjustments: [],
        referralPercent: 25,
        referralType: 'selling' as const,
        referralCompanyName: 'ABC Referrals',
      };

      const result = await caller.cda.calculate(input);

      expect(result.grossCommission).toBe(37500);
      expect(result.sellingReferralFee).toBe(4687.5); // 25% of selling side
      expect(result.listingReferralFee).toBe(0);
      expect(result.sellingCommissionAfterFees).toBe(14062.5);
      expect(result.listingCommissionAfterFees).toBe(18750);
      expect(result.isValid).toBe(true);
    });

    it('should calculate CDA with dual agents', async () => {
      const input = {
        propertyAddress: '789 Pine Rd, Houston, TX 77001',
        salePrice: 1000000,
        totalCommissionRate: 6.0,
        sellingSplitPercent: 50,
        listingSplitPercent: 50,
        sellingAgent1Name: 'Agent A',
        sellingAgent1SplitPercent: 60,
        sellingAgent2Name: 'Agent B',
        sellingAgent2SplitPercent: 20,
        sellingBrokerSplitPercent: 20,
        sellingOtherAdjustments: [],
        listingAgent1Name: 'Agent C',
        listingAgent1SplitPercent: 60,
        listingAgent2Name: 'Agent D',
        listingAgent2SplitPercent: 20,
        listingBrokerSplitPercent: 20,
        listingOtherAdjustments: [],
      };

      const result = await caller.cda.calculate(input);

      expect(result.grossCommission).toBe(60000);
      expect(result.sellingAgent1Commission).toBe(18000); // 60% of 30k
      expect(result.sellingAgent2Commission).toBe(6000); // 20% of 30k
      expect(result.sellingBrokerageCommission).toBe(6000); // 20% of 30k
      expect(result.listingAgent1Commission).toBe(18000);
      expect(result.listingAgent2Commission).toBe(6000);
      expect(result.listingBrokerageCommission).toBe(6000);
      expect(result.isValid).toBe(true);
    });

    it('should calculate CDA with adjustments', async () => {
      const input = {
        propertyAddress: '321 Elm St, San Antonio, TX 78201',
        salePrice: 600000,
        totalCommissionRate: 6.0,
        sellingSplitPercent: 50,
        listingSplitPercent: 50,
        sellingAgent1Name: 'Agent E',
        sellingAgent1SplitPercent: 80,
        sellingBrokerSplitPercent: 20,
        sellingOtherAdjustments: [
          { description: 'Transaction Fee', amount: -500 },
          { description: 'Marketing Credit', amount: 200 },
        ],
        listingAgent1Name: 'Agent F',
        listingAgent1SplitPercent: 80,
        listingBrokerSplitPercent: 20,
        listingOtherAdjustments: [
          { description: 'E&O Insurance', amount: -300 },
        ],
      };

      const result = await caller.cda.calculate(input);

      expect(result.grossCommission).toBe(36000);
      expect(result.sellingOtherAdjustmentsTotal).toBe(-300);
      expect(result.listingOtherAdjustmentsTotal).toBe(-300);
      expect(result.sellingCommissionAfterFees).toBe(17700);
      expect(result.listingCommissionAfterFees).toBe(17700);
      expect(result.isValid).toBe(true);
    });

    it('should detect invalid split percentages', async () => {
      const input = {
        propertyAddress: '999 Test St',
        salePrice: 500000,
        totalCommissionRate: 6.0,
        sellingSplitPercent: 50,
        listingSplitPercent: 50,
        sellingAgent1Name: 'Agent X',
        sellingAgent1SplitPercent: 90, // 90% + 20% = 110% (invalid)
        sellingBrokerSplitPercent: 20,
        sellingOtherAdjustments: [],
        listingAgent1Name: 'Agent Y',
        listingAgent1SplitPercent: 80,
        listingBrokerSplitPercent: 20,
        listingOtherAdjustments: [],
      };

      const result = await caller.cda.calculate(input);

      expect(result.isValid).toBe(false);
      expect(result.validationErrors.length).toBeGreaterThan(0);
      // Validation error message includes percentage information
      expect(result.validationErrors.some(e => e.toLowerCase().includes('percent') || e.toLowerCase().includes('total'))).toBe(true);
    });
  });

  describe('generatePDF endpoint', () => {
    it('should generate PDF for valid CDA data', async () => {
      const input = {
        propertyAddress: '123 Main St, Austin, TX 78701',
        salePrice: 500000,
        totalCommissionRate: 6.0,
        sellingSplitPercent: 50,
        listingSplitPercent: 50,
        sellingAgent1Name: 'John Smith',
        sellingAgent1SplitPercent: 80,
        sellingBrokerSplitPercent: 20,
        sellingOtherAdjustments: [],
        listingAgent1Name: 'Jane Doe',
        listingAgent1SplitPercent: 80,
        listingBrokerSplitPercent: 20,
        listingOtherAdjustments: [],
      };

      const result = await caller.cda.generatePDF(input);

      expect(result.success).toBe(true);
      expect(result.pdfBase64).toBeDefined();
      expect(result.pdfBase64.length).toBeGreaterThan(0);
      expect(result.calculation).toBeDefined();
      expect(result.calculation.isValid).toBe(true);

      // Verify base64 is valid
      const buffer = Buffer.from(result.pdfBase64, 'base64');
      expect(buffer.length).toBeGreaterThan(0);
      
      // PDF files start with %PDF
      const pdfHeader = buffer.toString('ascii', 0, 4);
      expect(pdfHeader).toBe('%PDF');
    });

    it('should generate PDF with referral fees', async () => {
      const input = {
        propertyAddress: '456 Oak Ave, Dallas, TX 75201',
        salePrice: 750000,
        totalCommissionRate: 5.0,
        sellingSplitPercent: 50,
        listingSplitPercent: 50,
        sellingAgent1Name: 'Alice Johnson',
        sellingAgent1SplitPercent: 75,
        sellingBrokerSplitPercent: 25,
        sellingOtherAdjustments: [],
        listingAgent1Name: 'Bob Williams',
        listingAgent1SplitPercent: 75,
        listingBrokerSplitPercent: 25,
        listingOtherAdjustments: [],
        referralPercent: 25,
        referralType: 'selling' as const,
        referralCompanyName: 'ABC Referrals',
      };

      const result = await caller.cda.generatePDF(input);

      expect(result.success).toBe(true);
      expect(result.pdfBase64).toBeDefined();
      expect(result.calculation.sellingReferralFee).toBeGreaterThan(0);
      
      const buffer = Buffer.from(result.pdfBase64, 'base64');
      expect(buffer.toString('ascii', 0, 4)).toBe('%PDF');
    });

    it('should generate PDF with dual agents', async () => {
      const input = {
        propertyAddress: '789 Pine Rd, Houston, TX 77001',
        salePrice: 1000000,
        totalCommissionRate: 6.0,
        sellingSplitPercent: 50,
        listingSplitPercent: 50,
        sellingAgent1Name: 'Agent A',
        sellingAgent1SplitPercent: 60,
        sellingAgent2Name: 'Agent B',
        sellingAgent2SplitPercent: 20,
        sellingBrokerSplitPercent: 20,
        sellingOtherAdjustments: [],
        listingAgent1Name: 'Agent C',
        listingAgent1SplitPercent: 60,
        listingAgent2Name: 'Agent D',
        listingAgent2SplitPercent: 20,
        listingBrokerSplitPercent: 20,
        listingOtherAdjustments: [],
      };

      const result = await caller.cda.generatePDF(input);

      expect(result.success).toBe(true);
      expect(result.calculation.sellingAgent2Commission).toBeGreaterThan(0);
      expect(result.calculation.listingAgent2Commission).toBeGreaterThan(0);
      
      const buffer = Buffer.from(result.pdfBase64, 'base64');
      expect(buffer.toString('ascii', 0, 4)).toBe('%PDF');
    });

    it('should generate PDF with adjustments', async () => {
      const input = {
        propertyAddress: '321 Elm St, San Antonio, TX 78201',
        salePrice: 600000,
        totalCommissionRate: 6.0,
        sellingSplitPercent: 50,
        listingSplitPercent: 50,
        sellingAgent1Name: 'Agent E',
        sellingAgent1SplitPercent: 80,
        sellingBrokerSplitPercent: 20,
        sellingOtherAdjustments: [
          { description: 'Transaction Fee', amount: -500 },
          { description: 'Marketing Credit', amount: 200 },
        ],
        listingAgent1Name: 'Agent F',
        listingAgent1SplitPercent: 80,
        listingBrokerSplitPercent: 20,
        listingOtherAdjustments: [
          { description: 'E&O Insurance', amount: -300 },
        ],
      };

      const result = await caller.cda.generatePDF(input);

      expect(result.success).toBe(true);
      expect(result.calculation.sellingOtherAdjustmentsTotal).toBe(-300);
      expect(result.calculation.listingOtherAdjustmentsTotal).toBe(-300);
      
      const buffer = Buffer.from(result.pdfBase64, 'base64');
      expect(buffer.toString('ascii', 0, 4)).toBe('%PDF');
    });

    it('should reject invalid CDA data', async () => {
      const input = {
        propertyAddress: '999 Test St',
        salePrice: 500000,
        totalCommissionRate: 6.0,
        sellingSplitPercent: 50,
        listingSplitPercent: 50,
        sellingAgent1Name: 'Agent X',
        sellingAgent1SplitPercent: 90, // Invalid: 90% + 20% = 110%
        sellingBrokerSplitPercent: 20,
        sellingOtherAdjustments: [],
        listingAgent1Name: 'Agent Y',
        listingAgent1SplitPercent: 80,
        listingBrokerSplitPercent: 20,
        listingOtherAdjustments: [],
      };

      await expect(caller.cda.generatePDF(input)).rejects.toThrow('Invalid CDA data');
    });

    it('should handle large sale prices', async () => {
      const input = {
        propertyAddress: '1 Luxury Lane, Austin, TX 78701',
        salePrice: 5000000,
        totalCommissionRate: 6.0,
        sellingSplitPercent: 50,
        listingSplitPercent: 50,
        sellingAgent1Name: 'Luxury Agent',
        sellingAgent1SplitPercent: 80,
        sellingBrokerSplitPercent: 20,
        sellingOtherAdjustments: [],
        listingAgent1Name: 'Premium Agent',
        listingAgent1SplitPercent: 80,
        listingBrokerSplitPercent: 20,
        listingOtherAdjustments: [],
      };

      const result = await caller.cda.generatePDF(input);

      expect(result.success).toBe(true);
      expect(result.calculation.grossCommission).toBe(300000);
      
      const buffer = Buffer.from(result.pdfBase64, 'base64');
      expect(buffer.toString('ascii', 0, 4)).toBe('%PDF');
    });

    it('should handle special characters in property address', async () => {
      const input = {
        propertyAddress: '123 O\'Brien St, Apt #4B, Austin, TX 78701',
        salePrice: 500000,
        totalCommissionRate: 6.0,
        sellingSplitPercent: 50,
        listingSplitPercent: 50,
        sellingAgent1Name: 'John O\'Malley',
        sellingAgent1SplitPercent: 80,
        sellingBrokerSplitPercent: 20,
        sellingOtherAdjustments: [],
        listingAgent1Name: 'María González',
        listingAgent1SplitPercent: 80,
        listingBrokerSplitPercent: 20,
        listingOtherAdjustments: [],
      };

      const result = await caller.cda.generatePDF(input);

      expect(result.success).toBe(true);
      
      const buffer = Buffer.from(result.pdfBase64, 'base64');
      expect(buffer.toString('ascii', 0, 4)).toBe('%PDF');
    });

    it('should handle zero commission scenarios', async () => {
      const input = {
        propertyAddress: '456 Zero Commission Rd',
        salePrice: 500000,
        totalCommissionRate: 0,
        sellingSplitPercent: 50,
        listingSplitPercent: 50,
        sellingAgent1Name: 'Agent Zero',
        sellingAgent1SplitPercent: 100,
        sellingBrokerSplitPercent: 0,
        sellingOtherAdjustments: [],
        listingAgent1Name: 'Agent Nil',
        listingAgent1SplitPercent: 100,
        listingBrokerSplitPercent: 0,
        listingOtherAdjustments: [],
      };

      await expect(caller.cda.generatePDF(input)).rejects.toThrow();
    });
  });
});
