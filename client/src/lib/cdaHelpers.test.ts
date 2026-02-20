/**
 * Tests for CDA Helper Functions
 * Tests transaction data mapping, commission plan integration, and URL encoding
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  mapTransactionToCDA,
  encodeCDAData,
  decodeCDAData,
  getCommissionPlanForAgent,
  type CDAFormData,
  type CommissionPlan,
} from './cdaHelpers';
import type { DotloopRecord } from './csvParser';

describe('CDA Helpers', () => {
  // Mock localStorage
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      clear: () => {
        store = {};
      },
    };
  })();

  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageMock,
      writable: true,
      configurable: true,
    });
    localStorageMock.clear();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  describe('mapTransactionToCDA', () => {
    it('should map basic transaction data to CDA form', () => {
      const transaction: DotloopRecord = {
        loopName: '123 Main St',
        streetAddress: '123 Main St',
        city: 'Austin',
        state: 'TX',
        zipCode: '78701',
        salePrice: 500000,
        price: 500000,
        grossCommission: 30000,
        agent: 'John Smith',
        agentName: 'John Smith',
        agents: 'John Smith',
        transactionType: 'Selling',
        loopStatus: 'Closed',
        closingDate: '2024-01-15',
        commissionTotal: 30000,
        createdDate: '2023-12-01',
        loopViewUrl: 'https://dotloop.com/loop/123',
        address: '123 Main St',
      };

      const result = mapTransactionToCDA(transaction);

      expect(result.propertyAddress).toBe('123 Main St, Austin, TX, 78701');
      expect(result.salePrice).toBe(500000);
      expect(result.totalCommissionRate).toBe(6.0);
      expect(result.sellingAgent1Name).toBe('John Smith');
      expect(result.sellingAgent1SplitPercent).toBe(80);
      expect(result.sellingBrokerSplitPercent).toBe(20);
    });

    it('should apply commission plan when provided', () => {
      const transaction: DotloopRecord = {
        loopName: '456 Oak Ave',
        salePrice: 750000,
        price: 750000,
        agent: 'Jane Doe',
        agents: 'Jane Doe',
        transactionType: 'Listing',
        loopStatus: 'Closed',
        closingDate: '2024-02-01',
        commissionTotal: 37500,
        createdDate: '2024-01-01',
        loopViewUrl: 'https://dotloop.com/loop/456',
        address: '456 Oak Ave',
      };

      const commissionPlan: CommissionPlan = {
        id: 'custom-plan',
        name: 'Custom 70/30',
        agentSplitPercent: 70,
        brokerSplitPercent: 30,
        transactionFee: 750,
      };

      const result = mapTransactionToCDA(transaction, commissionPlan);

      expect(result.listingAgent1SplitPercent).toBe(70);
      expect(result.listingBrokerSplitPercent).toBe(30);
      expect(result.listingOtherAdjustments).toHaveLength(1);
      expect(result.listingOtherAdjustments[0].description).toBe('Transaction Fee');
      expect(result.listingOtherAdjustments[0].amount).toBe(-750);
    });

    it('should handle missing address fields gracefully', () => {
      const transaction: DotloopRecord = {
        loopName: 'Property Deal',
        salePrice: 400000,
        price: 400000,
        agent: 'Bob Wilson',
        agents: 'Bob Wilson',
        transactionType: 'Selling',
        loopStatus: 'Closed',
        closingDate: '2024-03-01',
        commissionTotal: 24000,
        createdDate: '2024-02-01',
        loopViewUrl: 'https://dotloop.com/loop/789',
        address: 'Property Deal',
      };

      const result = mapTransactionToCDA(transaction);

      expect(result.propertyAddress).toBe('Property Deal');
      expect(result.salePrice).toBe(400000);
    });

    it('should calculate commission rate from gross commission and sale price', () => {
      const transaction: DotloopRecord = {
        loopName: '789 Pine Rd',
        salePrice: 1000000,
        price: 1000000,
        grossCommission: 50000, // 5% commission
        agent: 'Alice Johnson',
        agents: 'Alice Johnson',
        transactionType: 'Selling',
        loopStatus: 'Closed',
        closingDate: '2024-04-01',
        commissionTotal: 50000,
        createdDate: '2024-03-01',
        loopViewUrl: 'https://dotloop.com/loop/101',
        address: '789 Pine Rd',
      };

      const result = mapTransactionToCDA(transaction);

      expect(result.totalCommissionRate).toBe(5.0);
    });

    it('should use default commission rate when calculation not possible', () => {
      const transaction: DotloopRecord = {
        loopName: '321 Elm St',
        salePrice: 600000,
        price: 600000,
        agent: 'Charlie Brown',
        agents: 'Charlie Brown',
        transactionType: 'Listing',
        loopStatus: 'Closed',
        closingDate: '2024-05-01',
        commissionTotal: 0,
        createdDate: '2024-04-01',
        loopViewUrl: 'https://dotloop.com/loop/202',
        address: '321 Elm St',
      };

      const result = mapTransactionToCDA(transaction);

      expect(result.totalCommissionRate).toBe(6.0); // Default
    });
  });

  describe('encodeCDAData and decodeCDAData', () => {
    it('should encode and decode CDA data correctly', () => {
      const cdaData: CDAFormData = {
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

      const encoded = encodeCDAData(cdaData);
      const decoded = decodeCDAData(encoded);

      expect(decoded).toEqual(cdaData);
    });

    it('should handle complex CDA data with adjustments', () => {
      const cdaData: CDAFormData = {
        propertyAddress: '456 Oak Ave, Dallas, TX 75201',
        salePrice: 750000,
        totalCommissionRate: 5.0,
        sellingSplitPercent: 50,
        listingSplitPercent: 50,
        sellingAgent1Name: 'Alice Johnson',
        sellingAgent1SplitPercent: 75,
        sellingAgent2Name: 'Bob Wilson',
        sellingAgent2SplitPercent: 10,
        sellingBrokerSplitPercent: 15,
        sellingOtherAdjustments: [
          { description: 'Transaction Fee', amount: -500 },
          { description: 'Marketing Credit', amount: 200 },
        ],
        listingAgent1Name: 'Charlie Brown',
        listingAgent1SplitPercent: 85,
        listingBrokerSplitPercent: 15,
        listingOtherAdjustments: [
          { description: 'E&O Insurance', amount: -300 },
        ],
        referralPercent: 25,
        referralType: 'selling',
        referralCompanyName: 'ABC Referrals',
      };

      const encoded = encodeCDAData(cdaData);
      const decoded = decodeCDAData(encoded);

      expect(decoded).toEqual(cdaData);
      expect(decoded?.sellingOtherAdjustments).toHaveLength(2);
      expect(decoded?.listingOtherAdjustments).toHaveLength(1);
      expect(decoded?.referralPercent).toBe(25);
    });

    it('should return null for invalid encoded data', () => {
      const result = decodeCDAData('invalid-data');
      expect(result).toBeNull();
    });
  });

  describe('getCommissionPlanForAgent', () => {
    it('should return commission plan for assigned agent', () => {
      // Setup mock data in localStorage
      const plans = [
        {
          id: 'standard-80-20',
          name: 'Standard Capped (80/20)',
          splitPercentage: 80,
          capAmount: 18000,
          postCapSplit: 100,
          deductions: [
            { name: 'Transaction Fee', amount: 500, type: 'fixed', frequency: 'per_transaction' },
          ],
        },
      ];

      const assignments = [
        {
          id: 'assignment-1',
          agentName: 'John Smith',
          planId: 'standard-80-20',
        },
      ];

      localStorageMock.setItem('dotloop_commission_plans', JSON.stringify(plans));
      localStorageMock.setItem('dotloop_agent_assignments', JSON.stringify(assignments));

      const result = getCommissionPlanForAgent('John Smith');

      expect(result).toBeDefined();
      expect(result?.id).toBe('standard-80-20');
      expect(result?.name).toBe('Standard Capped (80/20)');
      expect(result?.agentSplitPercent).toBe(80);
      expect(result?.brokerSplitPercent).toBe(20);
      expect(result?.transactionFee).toBe(500);
    });

    it('should return undefined for unassigned agent', () => {
      const plans = [
        {
          id: 'standard-80-20',
          name: 'Standard Capped (80/20)',
          splitPercentage: 80,
          capAmount: 18000,
          postCapSplit: 100,
        },
      ];

      const assignments = [
        {
          id: 'assignment-1',
          agentName: 'John Smith',
          planId: 'standard-80-20',
        },
      ];

      localStorageMock.setItem('dotloop_commission_plans', JSON.stringify(plans));
      localStorageMock.setItem('dotloop_agent_assignments', JSON.stringify(assignments));

      const result = getCommissionPlanForAgent('Jane Doe');

      expect(result).toBeUndefined();
    });

    it('should return undefined when no assignments exist', () => {
      const result = getCommissionPlanForAgent('John Smith');
      expect(result).toBeUndefined();
    });

    it('should handle missing transaction fee gracefully', () => {
      const plans = [
        {
          id: 'no-fee-plan',
          name: 'No Fee Plan',
          splitPercentage: 90,
          capAmount: 0,
          postCapSplit: 90,
        },
      ];

      const assignments = [
        {
          id: 'assignment-2',
          agentName: 'Bob Wilson',
          planId: 'no-fee-plan',
        },
      ];

      localStorageMock.setItem('dotloop_commission_plans', JSON.stringify(plans));
      localStorageMock.setItem('dotloop_agent_assignments', JSON.stringify(assignments));

      const result = getCommissionPlanForAgent('Bob Wilson');

      expect(result).toBeDefined();
      expect(result?.transactionFee).toBe(0);
    });
  });
});
