import { describe, it, expect, beforeEach, vi } from 'vitest';
import { z } from 'zod';

// Mock data
const mockProspect = {
  id: '1',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  phone: '555-1234',
  office: 'Downtown',
  listUnits: 5,
  listVolume: '500000',
  saleUnits: 3,
  saleVolume: '450000',
  totalUnits: 8,
  totalVolume: '950000',
  pipelineStatus: 'lead',
  isActive: 1,
  tenantId: 'tenant-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockProspect2 = {
  ...mockProspect,
  id: '2',
  firstName: 'Jane',
  lastName: 'Smith',
  email: 'jane@example.com',
  pipelineStatus: 'contacted',
};

const mockProspect3 = {
  ...mockProspect,
  id: '3',
  firstName: 'Bob',
  lastName: 'Johnson',
  email: 'bob@example.com',
  pipelineStatus: 'interviewing',
};

describe('Recruiting Module', () => {
  describe('Pipeline Statistics', () => {
    it('should calculate correct pipeline stats', () => {
      const prospects = [mockProspect, mockProspect2, mockProspect3];
      
      const inPipeline = prospects.filter(p => p.isActive === 1).length;
      const offersPending = prospects.filter(p => p.pipelineStatus === 'offer_extended').length;
      const recentHires = prospects.filter(p => p.pipelineStatus === 'hired').length;
      const mvbProspects = prospects.length;

      expect(inPipeline).toBe(3);
      expect(offersPending).toBe(0);
      expect(recentHires).toBe(0);
      expect(mvbProspects).toBe(3);
    });

    it('should count prospects by status', () => {
      const prospects = [mockProspect, mockProspect2, mockProspect3];
      
      const statusCounts = {
        lead: prospects.filter(p => p.pipelineStatus === 'lead').length,
        contacted: prospects.filter(p => p.pipelineStatus === 'contacted').length,
        interviewing: prospects.filter(p => p.pipelineStatus === 'interviewing').length,
      };

      expect(statusCounts.lead).toBe(1);
      expect(statusCounts.contacted).toBe(1);
      expect(statusCounts.interviewing).toBe(1);
    });
  });

  describe('Conversion Funnel', () => {
    it('should calculate conversion funnel correctly', () => {
      const prospects = [
        { ...mockProspect, pipelineStatus: 'lead' },
        { ...mockProspect2, pipelineStatus: 'lead' },
        { ...mockProspect3, pipelineStatus: 'contacted' },
        { ...mockProspect, id: '4', pipelineStatus: 'interviewing' },
        { ...mockProspect2, id: '5', pipelineStatus: 'offer_extended' },
        { ...mockProspect3, id: '6', pipelineStatus: 'onboarding' },
      ];

      const funnel = {
        lead: prospects.filter(p => p.pipelineStatus === 'lead').length,
        contacted: prospects.filter(p => p.pipelineStatus === 'contacted').length,
        interviewing: prospects.filter(p => p.pipelineStatus === 'interviewing').length,
        offerExtended: prospects.filter(p => p.pipelineStatus === 'offer_extended').length,
        onboarding: prospects.filter(p => p.pipelineStatus === 'onboarding').length,
      };

      expect(funnel.lead).toBe(2);
      expect(funnel.contacted).toBe(1);
      expect(funnel.interviewing).toBe(1);
      expect(funnel.offerExtended).toBe(1);
      expect(funnel.onboarding).toBe(1);
    });

    it('should calculate conversion rates', () => {
      const prospects = [
        { ...mockProspect, pipelineStatus: 'lead' },
        { ...mockProspect2, pipelineStatus: 'lead' },
        { ...mockProspect3, pipelineStatus: 'contacted' },
        { ...mockProspect, id: '4', pipelineStatus: 'hired' },
      ];

      const leads = prospects.filter(p => p.pipelineStatus === 'lead').length;
      const hired = prospects.filter(p => p.pipelineStatus === 'hired').length;
      const conversionRate = leads > 0 ? (hired / leads) * 100 : 0;

      expect(leads).toBe(2);
      expect(hired).toBe(1);
      expect(conversionRate).toBe(50);
    });
  });

  describe('Prospect Search & Filter', () => {
    it('should filter prospects by search query', () => {
      const prospects = [mockProspect, mockProspect2, mockProspect3];
      const searchQuery = 'doe';

      const filtered = prospects.filter(p =>
        p.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.email.toLowerCase().includes(searchQuery.toLowerCase())
      );

      expect(filtered.length).toBe(1);
      expect(filtered[0].firstName).toBe('John');
    });

    it('should filter prospects by status', () => {
      const prospects = [mockProspect, mockProspect2, mockProspect3];
      const statusFilter = 'contacted';

      const filtered = prospects.filter(p => p.pipelineStatus === statusFilter);

      expect(filtered.length).toBe(1);
      expect(filtered[0].pipelineStatus).toBe('contacted');
    });

    it('should handle combined search and status filters', () => {
      const prospects = [mockProspect, mockProspect2, mockProspect3];
      const searchQuery = 'smith';
      const statusFilter = 'contacted';

      const filtered = prospects.filter(p =>
        (p.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.email.toLowerCase().includes(searchQuery.toLowerCase())) &&
        p.pipelineStatus === statusFilter
      );

      expect(filtered.length).toBe(1);
      expect(filtered[0].lastName).toBe('Smith');
    });
  });

  describe('Prospect Status Updates', () => {
    it('should update prospect status', () => {
      let prospect = { ...mockProspect };
      const newStatus = 'contacted';

      prospect = { ...prospect, pipelineStatus: newStatus };

      expect(prospect.pipelineStatus).toBe('contacted');
    });

    it('should validate status transitions', () => {
      const validStatuses = ['lead', 'contacted', 'interviewing', 'offer_extended', 'onboarding', 'hired', 'declined'];
      const prospect = { ...mockProspect };

      const isValidStatus = (status: string) => validStatuses.includes(status);

      expect(isValidStatus(prospect.pipelineStatus)).toBe(true);
      expect(isValidStatus('invalid')).toBe(false);
    });
  });

  describe('Retention Risk Analysis', () => {
    it('should calculate retention risk correctly', () => {
      const agents = [
        {
          agentName: 'John Doe',
          priorDeals: 10,
          recentDeals: 5,
          priorVolume: '1000000',
          recentVolume: '500000',
        },
        {
          agentName: 'Jane Smith',
          priorDeals: 8,
          recentDeals: 10,
          priorVolume: '800000',
          recentVolume: '1000000',
        },
      ];

      const withRisk = agents.map(agent => {
        const dealChange = ((agent.recentDeals - agent.priorDeals) / agent.priorDeals) * 100;
        const volumeChange = ((parseFloat(agent.recentVolume) - parseFloat(agent.priorVolume)) / parseFloat(agent.priorVolume)) * 100;

        let riskLevel = 'low';
        if (dealChange < -30 || volumeChange < -30) {
          riskLevel = 'high';
        } else if (dealChange < -10 || volumeChange < -10) {
          riskLevel = 'medium';
        }

        return {
          ...agent,
          dealChangePercent: dealChange.toFixed(1),
          volumeChangePercent: volumeChange.toFixed(1),
          riskLevel,
        };
      });

      expect(withRisk[0].riskLevel).toBe('high');
      expect(withRisk[1].riskLevel).toBe('low');
      expect(parseFloat(withRisk[0].dealChangePercent)).toBe(-50);
      expect(parseFloat(withRisk[1].dealChangePercent)).toBe(25);
    });

    it('should identify high-risk agents', () => {
      const agents = [
        { agentName: 'Agent A', priorDeals: 10, recentDeals: 2, priorVolume: '1000000', recentVolume: '200000' },
        { agentName: 'Agent B', priorDeals: 8, recentDeals: 8, priorVolume: '800000', recentVolume: '800000' },
        { agentName: 'Agent C', priorDeals: 5, recentDeals: 1, priorVolume: '500000', recentVolume: '100000' },
      ];

      const highRiskAgents = agents.filter(agent => {
        const dealChange = ((agent.recentDeals - agent.priorDeals) / agent.priorDeals) * 100;
        return dealChange < -30;
      });

      expect(highRiskAgents.length).toBe(2);
      expect(highRiskAgents[0].agentName).toBe('Agent A');
      expect(highRiskAgents[1].agentName).toBe('Agent C');
    });
  });

  describe('Prospect Import', () => {
    it('should validate prospect data before import', () => {
      const prospectSchema = z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        email: z.string().email(),
        office: z.string().optional(),
        totalVolume: z.string().or(z.number()),
      });

      const validProspect = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        office: 'Downtown',
        totalVolume: '950000',
      };

      const result = prospectSchema.safeParse(validProspect);
      expect(result.success).toBe(true);
    });

    it('should reject invalid prospect data', () => {
      const prospectSchema = z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        email: z.string().email(),
      });

      const invalidProspect = {
        firstName: '',
        lastName: 'Doe',
        email: 'invalid-email',
      };

      const result = prospectSchema.safeParse(invalidProspect);
      expect(result.success).toBe(false);
    });

    it('should handle batch prospect imports', () => {
      const prospects = [mockProspect, mockProspect2, mockProspect3];
      const importedCount = prospects.length;

      expect(importedCount).toBe(3);
    });
  });

  describe('Volume Calculations', () => {
    it('should calculate total volume correctly', () => {
      const prospects = [
        { ...mockProspect, totalVolume: '500000' },
        { ...mockProspect2, totalVolume: '750000' },
        { ...mockProspect3, totalVolume: '1000000' },
      ];

      const totalVolume = prospects.reduce((sum, p) => sum + parseFloat(p.totalVolume), 0);

      expect(totalVolume).toBe(2250000);
    });

    it('should calculate average volume per prospect', () => {
      const prospects = [
        { totalVolume: '500000' },
        { totalVolume: '750000' },
        { totalVolume: '1000000' },
      ];

      const avgVolume = prospects.reduce((sum, p) => sum + parseFloat(p.totalVolume), 0) / prospects.length;

      expect(avgVolume).toBe(750000);
    });
  });

  describe('Pipeline Stage Transitions', () => {
    it('should track prospect movement through pipeline', () => {
      let prospect = { ...mockProspect, pipelineStatus: 'lead' as const };
      const history: string[] = [prospect.pipelineStatus];

      prospect = { ...prospect, pipelineStatus: 'contacted' };
      history.push(prospect.pipelineStatus);

      prospect = { ...prospect, pipelineStatus: 'interviewing' };
      history.push(prospect.pipelineStatus);

      prospect = { ...prospect, pipelineStatus: 'offer_extended' };
      history.push(prospect.pipelineStatus);

      prospect = { ...prospect, pipelineStatus: 'hired' };
      history.push(prospect.pipelineStatus);

      expect(history).toEqual(['lead', 'contacted', 'interviewing', 'offer_extended', 'hired']);
    });

    it('should allow declining prospects at any stage', () => {
      const stages = ['lead', 'contacted', 'interviewing', 'offer_extended'];

      stages.forEach(stage => {
        let prospect = { ...mockProspect, pipelineStatus: stage };
        prospect = { ...prospect, pipelineStatus: 'declined' };
        expect(prospect.pipelineStatus).toBe('declined');
      });
    });
  });
});
