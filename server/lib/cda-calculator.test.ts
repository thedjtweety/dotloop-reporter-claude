import { describe, it, expect } from 'vitest';
import { calculateCDA, validateCDAData, type CDATransactionData } from './cda-calculator';

describe('CDA Calculator', () => {
  describe('Basic Calculations', () => {
    it('should calculate gross commission correctly', () => {
      const data: CDATransactionData = {
        propertyAddress: '123 Main St',
        salePrice: 500000,
        totalCommissionRate: 5.0, // 5%
      };
      
      const result = calculateCDA(data);
      expect(result.grossCommission).toBe(25000); // 500000 * 0.05
      expect(result.isValid).toBe(true);
    });
    
    it('should split commission 50/50 by default', () => {
      const data: CDATransactionData = {
        propertyAddress: '123 Main St',
        salePrice: 500000,
        totalCommissionRate: 6.0,
      };
      
      const result = calculateCDA(data);
      expect(result.sellingGrossCommission).toBe(15000); // 30000 * 0.5
      expect(result.listingGrossCommission).toBe(15000); // 30000 * 0.5
    });
    
    it('should handle custom selling/listing split', () => {
      const data: CDATransactionData = {
        propertyAddress: '123 Main St',
        salePrice: 400000,
        totalCommissionRate: 5.0,
        sellingSplitPercent: 60,
        listingSplitPercent: 40,
      };
      
      const result = calculateCDA(data);
      expect(result.grossCommission).toBe(20000);
      expect(result.sellingGrossCommission).toBe(12000); // 20000 * 0.6
      expect(result.listingGrossCommission).toBe(8000); // 20000 * 0.4
    });
  });
  
  describe('Referral Fee Calculations', () => {
    it('should deduct referral fee from selling side', () => {
      const data: CDATransactionData = {
        propertyAddress: '123 Main St',
        salePrice: 500000,
        totalCommissionRate: 6.0,
        referralPercent: 25,
        referralType: 'selling',
        referralCompanyName: 'Zillow',
      };
      
      const result = calculateCDA(data);
      expect(result.grossCommission).toBe(30000);
      expect(result.sellingGrossCommission).toBe(15000);
      expect(result.sellingReferralFee).toBe(3750); // 15000 * 0.25
      expect(result.sellingCommissionAfterFees).toBe(11250); // 15000 - 3750
      expect(result.listingReferralFee).toBe(0);
    });
    
    it('should deduct referral fee from listing side', () => {
      const data: CDATransactionData = {
        propertyAddress: '123 Main St',
        salePrice: 500000,
        totalCommissionRate: 6.0,
        referralPercent: 30,
        referralType: 'listing',
        referralCompanyName: 'OpCity',
      };
      
      const result = calculateCDA(data);
      expect(result.listingGrossCommission).toBe(15000);
      expect(result.listingReferralFee).toBe(4500); // 15000 * 0.3
      expect(result.listingCommissionAfterFees).toBe(10500); // 15000 - 4500
      expect(result.sellingReferralFee).toBe(0);
    });
  });
  
  describe('Other Adjustments', () => {
    it('should handle positive adjustments (additional fees)', () => {
      const data: CDATransactionData = {
        propertyAddress: '123 Main St',
        salePrice: 500000,
        totalCommissionRate: 6.0,
        sellingOtherAdjustments: [
          { description: 'Transaction Fee', amount: 500 },
          { description: 'Admin Fee', amount: 250 },
        ],
      };
      
      const result = calculateCDA(data);
      expect(result.sellingOtherAdjustmentsTotal).toBe(750);
      expect(result.sellingCommissionAfterFees).toBe(15750); // 15000 + 750
    });
    
    it('should handle negative adjustments (deductions)', () => {
      const data: CDATransactionData = {
        propertyAddress: '123 Main St',
        salePrice: 500000,
        totalCommissionRate: 6.0,
        listingOtherAdjustments: [
          { description: 'E&O Insurance', amount: -300 },
          { description: 'Desk Fee', amount: -200 },
        ],
      };
      
      const result = calculateCDA(data);
      expect(result.listingOtherAdjustmentsTotal).toBe(-500);
      expect(result.listingCommissionAfterFees).toBe(14500); // 15000 - 500
    });
    
    it('should handle mixed adjustments', () => {
      const data: CDATransactionData = {
        propertyAddress: '123 Main St',
        salePrice: 500000,
        totalCommissionRate: 6.0,
        sellingOtherAdjustments: [
          { description: 'Bonus', amount: 1000 },
          { description: 'Desk Fee', amount: -500 },
        ],
      };
      
      const result = calculateCDA(data);
      expect(result.sellingOtherAdjustmentsTotal).toBe(500);
      expect(result.sellingCommissionAfterFees).toBe(15500); // 15000 + 500
    });
  });
  
  describe('Agent Split Calculations', () => {
    it('should calculate single agent split correctly', () => {
      const data: CDATransactionData = {
        propertyAddress: '123 Main St',
        salePrice: 500000,
        totalCommissionRate: 6.0,
        sellingAgent1Name: 'John Doe',
        sellingAgent1SplitPercent: 80,
        sellingBrokerSplitPercent: 20,
      };
      
      const result = calculateCDA(data);
      expect(result.sellingCommissionAfterFees).toBe(15000);
      expect(result.sellingAgent1Commission).toBe(12000); // 15000 * 0.8
      expect(result.sellingBrokerageCommission).toBe(3000); // 15000 * 0.2
    });
    
    it('should calculate dual agent split correctly', () => {
      const data: CDATransactionData = {
        propertyAddress: '123 Main St',
        salePrice: 500000,
        totalCommissionRate: 6.0,
        sellingAgent1Name: 'John Doe',
        sellingAgent1SplitPercent: 40,
        sellingAgent2Name: 'Jane Smith',
        sellingAgent2SplitPercent: 40,
        sellingBrokerSplitPercent: 20,
      };
      
      const result = calculateCDA(data);
      expect(result.sellingAgent1Commission).toBe(6000); // 15000 * 0.4
      expect(result.sellingAgent2Commission).toBe(6000); // 15000 * 0.4
      expect(result.sellingBrokerageCommission).toBe(3000); // 15000 * 0.2
    });
    
    it('should handle 100% to agent (no broker split)', () => {
      const data: CDATransactionData = {
        propertyAddress: '123 Main St',
        salePrice: 500000,
        totalCommissionRate: 6.0,
        sellingAgent1Name: 'John Doe',
        sellingAgent1SplitPercent: 100,
        sellingBrokerSplitPercent: 0,
      };
      
      const result = calculateCDA(data);
      expect(result.sellingAgent1Commission).toBe(15000);
      expect(result.sellingBrokerageCommission).toBe(0);
    });
  });
  
  describe('Complex Scenarios', () => {
    it('should handle full transaction with all features', () => {
      const data: CDATransactionData = {
        propertyAddress: '456 Oak Ave',
        salePrice: 750000,
        totalCommissionRate: 5.5,
        sellingSplitPercent: 55,
        listingSplitPercent: 45,
        
        // Selling side
        sellingAgent1Name: 'Alice Johnson',
        sellingAgent1SplitPercent: 75,
        sellingBrokerSplitPercent: 25,
        sellingOtherAdjustments: [
          { description: 'Transaction Fee', amount: 395 },
        ],
        
        // Listing side with referral
        referralPercent: 25,
        referralType: 'listing',
        referralCompanyName: 'Zillow',
        listingAgent1Name: 'Bob Williams',
        listingAgent1SplitPercent: 80,
        listingBrokerSplitPercent: 20,
        listingOtherAdjustments: [
          { description: 'E&O Insurance', amount: -150 },
        ],
      };
      
      const result = calculateCDA(data);
      
      // Gross commission: 750000 * 0.055 = 41250
      expect(result.grossCommission).toBe(41250);
      
      // Selling side: 41250 * 0.55 = 22687.5
      expect(result.sellingGrossCommission).toBe(22687.5);
      expect(result.sellingReferralFee).toBe(0);
      expect(result.sellingOtherAdjustmentsTotal).toBe(395);
      expect(result.sellingCommissionAfterFees).toBe(23082.5); // 22687.5 + 395
      expect(result.sellingAgent1Commission).toBe(17311.88); // 23082.5 * 0.75
      expect(result.sellingBrokerageCommission).toBe(5770.63); // 23082.5 * 0.25
      
      // Listing side: 41250 * 0.45 = 18562.5
      expect(result.listingGrossCommission).toBe(18562.5);
      expect(result.listingReferralFee).toBe(4640.63); // 18562.5 * 0.25
      expect(result.listingOtherAdjustmentsTotal).toBe(-150);
      expect(result.listingCommissionAfterFees).toBe(13771.87); // 18562.5 - 4640.63 - 150
      expect(result.listingAgent1Commission).toBe(11017.5); // 13771.87 * 0.8
      expect(result.listingBrokerageCommission).toBe(2754.37); // 13771.87 * 0.2
      
      if (!result.isValid) {
        console.log('Validation errors:', result.validationErrors);
        console.log('Total disbursed:', 
          result.sellingAgent1Commission +
          result.sellingAgent2Commission +
          result.sellingBrokerageCommission +
          result.listingAgent1Commission +
          result.listingAgent2Commission +
          result.listingBrokerageCommission +
          result.sellingReferralFee +
          result.listingReferralFee
        );
        console.log('Expected total:', result.grossCommission + result.sellingOtherAdjustmentsTotal + result.listingOtherAdjustmentsTotal);
      }
      expect(result.isValid).toBe(true);
    });
    
    it('should handle transaction with both sides having dual agents', () => {
      const data: CDATransactionData = {
        propertyAddress: '789 Pine Rd',
        salePrice: 1000000,
        totalCommissionRate: 6.0,
        
        // Selling side - 2 agents
        sellingAgent1Name: 'Agent A',
        sellingAgent1SplitPercent: 45,
        sellingAgent2Name: 'Agent B',
        sellingAgent2SplitPercent: 35,
        sellingBrokerSplitPercent: 20,
        
        // Listing side - 2 agents
        listingAgent1Name: 'Agent C',
        listingAgent1SplitPercent: 40,
        listingAgent2Name: 'Agent D',
        listingAgent2SplitPercent: 40,
        listingBrokerSplitPercent: 20,
      };
      
      const result = calculateCDA(data);
      
      expect(result.grossCommission).toBe(60000);
      
      // Selling side
      expect(result.sellingAgent1Commission).toBe(13500); // 30000 * 0.45
      expect(result.sellingAgent2Commission).toBe(10500); // 30000 * 0.35
      expect(result.sellingBrokerageCommission).toBe(6000); // 30000 * 0.2
      
      // Listing side
      expect(result.listingAgent1Commission).toBe(12000); // 30000 * 0.4
      expect(result.listingAgent2Commission).toBe(12000); // 30000 * 0.4
      expect(result.listingBrokerageCommission).toBe(6000); // 30000 * 0.2
      
      expect(result.isValid).toBe(true);
    });
  });
  
  describe('Validation', () => {
    it('should detect invalid selling/listing split', () => {
      const data: CDATransactionData = {
        propertyAddress: '123 Main St',
        salePrice: 500000,
        totalCommissionRate: 6.0,
        sellingSplitPercent: 60,
        listingSplitPercent: 50, // Should be 40
      };
      
      const result = calculateCDA(data);
      expect(result.isValid).toBe(false);
      expect(result.validationErrors).toContain('Selling split (60%) + Listing split (50%) must equal 100%');
    });
    
    it('should detect invalid agent split percentages', () => {
      const data: CDATransactionData = {
        propertyAddress: '123 Main St',
        salePrice: 500000,
        totalCommissionRate: 6.0,
        sellingAgent1SplitPercent: 80,
        sellingAgent2SplitPercent: 30, // Total = 110% (invalid)
        sellingBrokerSplitPercent: 0,
      };
      
      const result = calculateCDA(data);
      expect(result.isValid).toBe(false);
      expect(result.validationErrors.length).toBeGreaterThan(0);
    });
    
    it('should validate required fields', () => {
      const data: CDATransactionData = {
        propertyAddress: '',
        salePrice: 0,
        totalCommissionRate: 0,
      };
      
      const validation = validateCDAData(data);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Property address is required');
      expect(validation.errors).toContain('Sale price must be greater than 0');
      expect(validation.errors).toContain('Commission rate must be greater than 0');
    });
    
    it('should validate percentage ranges', () => {
      const data: CDATransactionData = {
        propertyAddress: '123 Main St',
        salePrice: 500000,
        totalCommissionRate: 6.0,
        sellingSplitPercent: 150, // Invalid
        referralPercent: -10, // Invalid
      };
      
      const validation = validateCDAData(data);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Selling split percent must be between 0 and 100');
      expect(validation.errors).toContain('Referral percent must be between 0 and 100');
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle zero commission rate', () => {
      const data: CDATransactionData = {
        propertyAddress: '123 Main St',
        salePrice: 500000,
        totalCommissionRate: 0,
      };
      
      const result = calculateCDA(data);
      expect(result.grossCommission).toBe(0);
    });
    
    it('should handle very small commission rates', () => {
      const data: CDATransactionData = {
        propertyAddress: '123 Main St',
        salePrice: 500000,
        totalCommissionRate: 0.5, // 0.5%
      };
      
      const result = calculateCDA(data);
      expect(result.grossCommission).toBe(2500);
    });
    
    it('should handle very large sale prices', () => {
      const data: CDATransactionData = {
        propertyAddress: '123 Main St',
        salePrice: 10000000, // $10M
        totalCommissionRate: 4.0,
      };
      
      const result = calculateCDA(data);
      expect(result.grossCommission).toBe(400000);
    });
    
    it('should round correctly to avoid floating-point errors', () => {
      const data: CDATransactionData = {
        propertyAddress: '123 Main St',
        salePrice: 333333.33,
        totalCommissionRate: 3.33,
      };
      
      const result = calculateCDA(data);
      // Should round to 2 decimal places
      expect(result.grossCommission).toBe(11100);
      expect(result.sellingGrossCommission).toBe(5550);
      expect(result.listingGrossCommission).toBe(5550);
    });
    
    it('should handle 100% referral fee (entire commission to referral)', () => {
      const data: CDATransactionData = {
        propertyAddress: '123 Main St',
        salePrice: 500000,
        totalCommissionRate: 6.0,
        referralPercent: 100,
        referralType: 'selling',
        referralCompanyName: 'Referral Co',
      };
      
      const result = calculateCDA(data);
      expect(result.sellingReferralFee).toBe(15000);
      expect(result.sellingCommissionAfterFees).toBe(0);
      expect(result.sellingAgent1Commission).toBe(0);
      expect(result.sellingBrokerageCommission).toBe(0);
    });
  });
  
  describe('Real-World Scenarios from Sample CDA', () => {
    it('should match sample CDA calculation (Page 1 example)', () => {
      // Based on the sample CDA provided
      const data: CDATransactionData = {
        propertyAddress: '123 Sample St',
        salePrice: 500000,
        totalCommissionRate: 6.0, // 6%
        sellingSplitPercent: 50,
        listingSplitPercent: 50,
        
        // Selling side
        sellingAgent1Name: 'Selling Agent',
        sellingAgent1SplitPercent: 80,
        sellingBrokerSplitPercent: 20,
        
        // Listing side
        listingAgent1Name: 'Listing Agent',
        listingAgent1SplitPercent: 80,
        listingBrokerSplitPercent: 20,
      };
      
      const result = calculateCDA(data);
      
      // Gross Commission: $30,000
      expect(result.grossCommission).toBe(30000);
      
      // Selling side: $15,000
      expect(result.sellingGrossCommission).toBe(15000);
      expect(result.sellingAgent1Commission).toBe(12000); // 80%
      expect(result.sellingBrokerageCommission).toBe(3000); // 20%
      
      // Listing side: $15,000
      expect(result.listingGrossCommission).toBe(15000);
      expect(result.listingAgent1Commission).toBe(12000); // 80%
      expect(result.listingBrokerageCommission).toBe(3000); // 20%
      
      expect(result.isValid).toBe(true);
    });
  });
});
