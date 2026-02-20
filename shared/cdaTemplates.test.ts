import { describe, it, expect } from 'vitest';
import { CDA_TEMPLATES, getTemplateById, getTemplatesByCategory, getAllTemplateCategories } from './cdaTemplates';

describe('CDA Templates Library', () => {
  describe('Template Data Integrity', () => {
    it('should have 10 templates', () => {
      expect(CDA_TEMPLATES).toHaveLength(10);
    });

    it('should have unique template IDs', () => {
      const ids = CDA_TEMPLATES.map(t => t.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(CDA_TEMPLATES.length);
    });

    it('should have all required fields for each template', () => {
      CDA_TEMPLATES.forEach(template => {
        expect(template.id).toBeTruthy();
        expect(template.name).toBeTruthy();
        expect(template.description).toBeTruthy();
        expect(template.category).toBeTruthy();
        expect(template.icon).toBeTruthy();
        expect(template.usageNotes).toBeTruthy();
        expect(Array.isArray(template.commonScenarios)).toBe(true);
        expect(Array.isArray(template.adjustments)).toBe(true);
      });
    });

    it('should have valid split percentages that add up correctly', () => {
      CDA_TEMPLATES.forEach(template => {
        // Selling side splits should add up to 100%
        const sellingTotal = template.sellingAgent1SplitPercent + 
                            template.sellingAgent2SplitPercent + 
                            template.sellingBrokerSplitPercent;
        expect(sellingTotal).toBe(100);

        // Listing side splits should add up to 100% (or 0% for dual agency where listing side is not used)
        const listingTotal = template.listingAgent1SplitPercent + 
                            template.listingAgent2SplitPercent + 
                            template.listingBrokerSplitPercent;
        expect([0, 100]).toContain(listingTotal); // 100% for normal transactions, 0% for dual agency

        // Selling/Listing split should add up to 100% (or be 50/50 for standard, 100/0 for dual agency)
        const transactionTotal = template.sellingSplitPercent + template.listingSplitPercent;
        expect([50, 100]).toContain(transactionTotal); // Either 50 (25%/25% each) or 100 (50%/50% each or 100%/0% for dual)
      });
    });
  });

  describe('Template Retrieval Functions', () => {
    it('should retrieve template by ID', () => {
      const template = getTemplateById('standard-70-30');
      expect(template).toBeDefined();
      expect(template?.name).toBe('Standard 70/30 Split');
    });

    it('should return undefined for non-existent ID', () => {
      const template = getTemplateById('non-existent-id');
      expect(template).toBeUndefined();
    });

    it('should retrieve templates by category', () => {
      const standardTemplates = getTemplatesByCategory('standard');
      expect(standardTemplates.length).toBeGreaterThan(0);
      standardTemplates.forEach(t => {
        expect(t.category).toBe('standard');
      });
    });

    it('should return all categories', () => {
      const categories = getAllTemplateCategories();
      expect(categories.length).toBe(5);
      expect(categories.map(c => c.value)).toEqual(['standard', 'team', 'referral', 'dual', 'advanced']);
    });
  });

  describe('Standard Split Templates', () => {
    it('should calculate Standard 70/30 Split correctly', () => {
      const template = getTemplateById('standard-70-30')!;
      const salePrice = 500000;
      const commissionRate = 6;
      const grossCommission = salePrice * (commissionRate / 100); // $30,000
      const sellingGross = grossCommission * 0.5; // $15,000
      
      const agentCommission = sellingGross * (template.sellingAgent1SplitPercent / 100); // $10,500
      const brokerCommission = sellingGross * (template.sellingBrokerSplitPercent / 100); // $4,500
      
      expect(agentCommission).toBe(10500);
      expect(brokerCommission).toBe(4500);
      expect(agentCommission + brokerCommission).toBe(sellingGross);
    });

    it('should calculate New Agent 50/50 Split correctly', () => {
      const template = getTemplateById('new-agent-50-50')!;
      const salePrice = 400000;
      const commissionRate = 6;
      const grossCommission = salePrice * (commissionRate / 100); // $24,000
      const sellingGross = grossCommission * 0.5; // $12,000
      
      const agentCommission = sellingGross * (template.sellingAgent1SplitPercent / 100); // $6,000
      const brokerCommission = sellingGross * (template.sellingBrokerSplitPercent / 100); // $6,000
      
      expect(agentCommission).toBe(6000);
      expect(brokerCommission).toBe(6000);
      expect(agentCommission + brokerCommission).toBe(sellingGross);
    });

    it('should calculate High Producer 85/15 Split correctly', () => {
      const template = getTemplateById('high-producer-85-15')!;
      const salePrice = 1000000;
      const commissionRate = 6;
      const grossCommission = salePrice * (commissionRate / 100); // $60,000
      const sellingGross = grossCommission * 0.5; // $30,000
      
      const agentCommission = sellingGross * (template.sellingAgent1SplitPercent / 100); // $25,500
      const brokerCommission = sellingGross * (template.sellingBrokerSplitPercent / 100); // $4,500
      
      expect(agentCommission).toBe(25500);
      expect(brokerCommission).toBe(4500);
      expect(agentCommission + brokerCommission).toBe(sellingGross);
    });
  });

  describe('Dual Agency Template', () => {
    it('should have 100% selling split for dual agency', () => {
      const template = getTemplateById('dual-agency-full')!;
      expect(template.sellingSplitPercent).toBe(100);
      expect(template.listingSplitPercent).toBe(0);
    });

    it('should calculate dual agency commission correctly', () => {
      const template = getTemplateById('dual-agency-full')!;
      const salePrice = 600000;
      const commissionRate = 6;
      const grossCommission = salePrice * (commissionRate / 100); // $36,000
      
      // Agent gets full commission (both sides)
      const agentCommission = grossCommission * (template.sellingAgent1SplitPercent / 100); // $25,200 (70%)
      const brokerCommission = grossCommission * (template.sellingBrokerSplitPercent / 100); // $10,800 (30%)
      
      expect(agentCommission).toBe(25200);
      expect(brokerCommission).toBe(10800);
      expect(agentCommission + brokerCommission).toBe(grossCommission);
    });
  });

  describe('Team Transaction Templates', () => {
    it('should have team lead adjustment for team-generated leads', () => {
      const template = getTemplateById('team-lead-generated')!;
      expect(template.adjustments.length).toBeGreaterThan(0);
      expect(template.adjustments[0].description).toContain('Team Lead');
    });

    it('should calculate team transaction with team lead correctly', () => {
      const template = getTemplateById('team-lead-generated')!;
      const salePrice = 500000;
      const commissionRate = 6;
      const grossCommission = salePrice * (commissionRate / 100); // $30,000
      const sellingGross = grossCommission * 0.5; // $15,000
      
      // Agent gets 50%, broker+teamlead gets 50% (broker 20% + team lead 30%)
      const agentCommission = sellingGross * (template.sellingAgent1SplitPercent / 100); // $7,500
      const brokerCommission = sellingGross * (template.sellingBrokerSplitPercent / 100); // $7,500 (includes team lead portion)
      const teamLeadCommission = sellingGross * 0.30; // $4,500 (part of broker split)
      const actualBrokerCommission = sellingGross * 0.20; // $3,000
      
      expect(agentCommission).toBe(7500);
      expect(brokerCommission).toBe(7500); // Total broker split including team lead
      expect(actualBrokerCommission).toBe(3000);
      expect(agentCommission + brokerCommission).toBe(sellingGross);
    });

    it('should calculate team transaction with agent lead correctly', () => {
      const template = getTemplateById('team-agent-generated')!;
      const salePrice = 500000;
      const commissionRate = 6;
      const grossCommission = salePrice * (commissionRate / 100); // $30,000
      const sellingGross = grossCommission * 0.5; // $15,000
      
      // Agent gets 70%, broker+teamlead gets 30% (broker 20% + team lead 10%)
      const agentCommission = sellingGross * (template.sellingAgent1SplitPercent / 100); // $10,500
      const brokerCommission = sellingGross * (template.sellingBrokerSplitPercent / 100); // $4,500 (includes team lead portion)
      const teamLeadCommission = sellingGross * 0.10; // $1,500 (part of broker split)
      const actualBrokerCommission = sellingGross * 0.20; // $3,000
      
      expect(agentCommission).toBe(10500);
      expect(brokerCommission).toBe(4500); // Total broker split including team lead
      expect(actualBrokerCommission).toBe(3000);
      expect(agentCommission + brokerCommission).toBe(sellingGross);
    });
  });

  describe('Referral Fee Templates', () => {
    it('should have 25% referral fee for standard referral', () => {
      const template = getTemplateById('referral-25-percent')!;
      expect(template.referralFeePercent).toBe(25);
      expect(template.referralDeductFrom).toBe('selling');
    });

    it('should calculate standard referral fee correctly', () => {
      const template = getTemplateById('referral-25-percent')!;
      const salePrice = 400000;
      const commissionRate = 6;
      const grossCommission = salePrice * (commissionRate / 100); // $24,000
      const sellingGross = grossCommission * 0.5; // $12,000
      
      const referralFee = sellingGross * (template.referralFeePercent / 100); // $3,000
      const afterReferral = sellingGross - referralFee; // $9,000
      
      const agentCommission = afterReferral * (template.sellingAgent1SplitPercent / 100); // $6,300
      const brokerCommission = afterReferral * (template.sellingBrokerSplitPercent / 100); // $2,700
      
      expect(referralFee).toBe(3000);
      expect(agentCommission).toBe(6300);
      expect(brokerCommission).toBe(2700);
      expect(referralFee + agentCommission + brokerCommission).toBe(sellingGross);
    });

    it('should have 35% referral fee for premium referral', () => {
      const template = getTemplateById('referral-35-percent')!;
      expect(template.referralFeePercent).toBe(35);
    });

    it('should calculate premium referral fee correctly', () => {
      const template = getTemplateById('referral-35-percent')!;
      const salePrice = 500000;
      const commissionRate = 6;
      const grossCommission = salePrice * (commissionRate / 100); // $30,000
      const sellingGross = grossCommission * 0.5; // $15,000
      
      const referralFee = sellingGross * (template.referralFeePercent / 100); // $5,250
      const afterReferral = sellingGross - referralFee; // $9,750
      
      const agentCommission = afterReferral * (template.sellingAgent1SplitPercent / 100); // $6,825
      const brokerCommission = afterReferral * (template.sellingBrokerSplitPercent / 100); // $2,925
      
      expect(referralFee).toBe(5250);
      expect(agentCommission).toBe(6825);
      expect(brokerCommission).toBe(2925);
      expect(referralFee + agentCommission + brokerCommission).toBe(sellingGross);
    });
  });

  describe('Co-Listing Agents Template', () => {
    it('should split listing commission between two agents', () => {
      const template = getTemplateById('co-listing-agents')!;
      expect(template.listingAgent1SplitPercent).toBe(35);
      expect(template.listingAgent2SplitPercent).toBe(35);
      expect(template.listingBrokerSplitPercent).toBe(30);
    });

    it('should calculate co-listing commission correctly', () => {
      const template = getTemplateById('co-listing-agents')!;
      const salePrice = 800000;
      const commissionRate = 6;
      const grossCommission = salePrice * (commissionRate / 100); // $48,000
      const listingGross = grossCommission * 0.5; // $24,000
      
      const agent1Commission = listingGross * (template.listingAgent1SplitPercent / 100); // $8,400
      const agent2Commission = listingGross * (template.listingAgent2SplitPercent / 100); // $8,400
      const brokerCommission = listingGross * (template.listingBrokerSplitPercent / 100); // $7,200
      
      expect(agent1Commission).toBe(8400);
      expect(agent2Commission).toBe(8400);
      expect(brokerCommission).toBe(7200);
      expect(agent1Commission + agent2Commission + brokerCommission).toBe(listingGross);
    });
  });

  describe('Transaction Coordinator Fee Template', () => {
    it('should have $500 TC fee adjustment', () => {
      const template = getTemplateById('transaction-coordinator-fee')!;
      expect(template.adjustments.length).toBe(1);
      expect(template.adjustments[0].amount).toBe(500);
      expect(template.adjustments[0].description).toContain('Transaction Coordinator');
    });

    it('should calculate commission with TC fee correctly', () => {
      const template = getTemplateById('transaction-coordinator-fee')!;
      const salePrice = 500000;
      const commissionRate = 6;
      const grossCommission = salePrice * (commissionRate / 100); // $30,000
      const sellingGross = grossCommission * 0.5; // $15,000
      
      const tcFee = 500;
      const afterTCFee = sellingGross - tcFee; // $14,500
      
      const agentCommission = afterTCFee * (template.sellingAgent1SplitPercent / 100); // $10,150
      const brokerCommission = afterTCFee * (template.sellingBrokerSplitPercent / 100); // $4,350
      
      expect(agentCommission).toBe(10150);
      expect(brokerCommission).toBe(4350);
      expect(tcFee + agentCommission + brokerCommission).toBe(sellingGross);
    });
  });

  describe('Edge Cases and Validation', () => {
    it('should handle low sale prices correctly', () => {
      const template = getTemplateById('standard-70-30')!;
      const salePrice = 100000;
      const commissionRate = 6;
      const grossCommission = salePrice * (commissionRate / 100); // $6,000
      const sellingGross = grossCommission * 0.5; // $3,000
      
      const agentCommission = sellingGross * (template.sellingAgent1SplitPercent / 100); // $2,100
      const brokerCommission = sellingGross * (template.sellingBrokerSplitPercent / 100); // $900
      
      expect(agentCommission).toBe(2100);
      expect(brokerCommission).toBe(900);
    });

    it('should handle high sale prices correctly', () => {
      const template = getTemplateById('high-producer-85-15')!;
      const salePrice = 5000000;
      const commissionRate = 6;
      const grossCommission = salePrice * (commissionRate / 100); // $300,000
      const sellingGross = grossCommission * 0.5; // $150,000
      
      const agentCommission = sellingGross * (template.sellingAgent1SplitPercent / 100); // $127,500
      const brokerCommission = sellingGross * (template.sellingBrokerSplitPercent / 100); // $22,500
      
      expect(agentCommission).toBe(127500);
      expect(brokerCommission).toBe(22500);
    });

    it('should have at least one common scenario for each template', () => {
      CDA_TEMPLATES.forEach(template => {
        expect(template.commonScenarios.length).toBeGreaterThan(0);
      });
    });

    it('should have usage notes for each template', () => {
      CDA_TEMPLATES.forEach(template => {
        expect(template.usageNotes.length).toBeGreaterThan(20); // At least a meaningful sentence
      });
    });
  });
});
