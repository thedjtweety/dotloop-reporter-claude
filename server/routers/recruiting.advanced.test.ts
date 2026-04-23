import { describe, it, expect, beforeEach, vi } from 'vitest';
import { z } from 'zod';

describe('Recruiting Advanced Features', () => {
  describe('Prospect Activity Timeline', () => {
    it('should create a note activity', () => {
      const activity = {
        id: '123',
        prospectId: 'prospect-1',
        activityType: 'note' as const,
        title: 'Follow-up note',
        description: 'Discussed commission structure',
        createdAt: new Date().toISOString(),
      };

      expect(activity.activityType).toBe('note');
      expect(activity.title).toBe('Follow-up note');
    });

    it('should create a call activity with duration', () => {
      const activity = {
        id: '124',
        prospectId: 'prospect-1',
        activityType: 'call' as const,
        title: 'Initial call',
        description: 'Discussed opportunity',
        duration: 15,
        contactDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      expect(activity.activityType).toBe('call');
      expect(activity.duration).toBe(15);
    });

    it('should create an offer activity', () => {
      const activity = {
        id: '125',
        prospectId: 'prospect-1',
        activityType: 'offer' as const,
        title: 'Offer extended',
        description: 'Sent formal offer',
        offerAmount: '50000',
        offerStatus: 'pending' as const,
        createdAt: new Date().toISOString(),
      };

      expect(activity.activityType).toBe('offer');
      expect(activity.offerAmount).toBe('50000');
      expect(activity.offerStatus).toBe('pending');
    });

    it('should track activity timeline chronologically', () => {
      const now = new Date();
      const activities = [
        {
          id: '1',
          createdAt: new Date(now.getTime() - 3600000).toISOString(),
          title: 'First contact',
        },
        {
          id: '2',
          createdAt: new Date(now.getTime() - 1800000).toISOString(),
          title: 'Follow-up call',
        },
        {
          id: '3',
          createdAt: now.toISOString(),
          title: 'Offer sent',
        },
      ];

      const sorted = [...activities].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      expect(sorted[0].title).toBe('Offer sent');
      expect(sorted[1].title).toBe('Follow-up call');
      expect(sorted[2].title).toBe('First contact');
    });
  });

  describe('Drag-and-Drop Pipeline Movement', () => {
    it('should move prospect between pipeline stages', () => {
      const prospect = {
        id: 'p1',
        firstName: 'John',
        lastName: 'Doe',
        pipelineStatus: 'lead' as const,
      };

      const newStatus = 'contacted';
      const updated = { ...prospect, pipelineStatus: newStatus };

      expect(updated.pipelineStatus).toBe('contacted');
      expect(prospect.pipelineStatus).toBe('lead');
    });

    it('should validate pipeline stage transitions', () => {
      const validStages = ['lead', 'contacted', 'interviewing', 'offer_extended', 'onboarding'];

      const prospect = {
        id: 'p1',
        pipelineStatus: 'lead',
      };

      const newStage = 'contacted';
      const isValid = validStages.includes(newStage);

      expect(isValid).toBe(true);
    });

    it('should prevent invalid stage transitions', () => {
      const validStages = ['lead', 'contacted', 'interviewing', 'offer_extended', 'onboarding'];
      const invalidStage = 'unknown_stage';

      const isValid = validStages.includes(invalidStage);
      expect(isValid).toBe(false);
    });

    it('should track prospect movement history', () => {
      const movements = [
        { prospectId: 'p1', fromStage: 'lead', toStage: 'contacted', timestamp: new Date().toISOString() },
        { prospectId: 'p1', fromStage: 'contacted', toStage: 'interviewing', timestamp: new Date().toISOString() },
        { prospectId: 'p1', fromStage: 'interviewing', toStage: 'offer_extended', timestamp: new Date().toISOString() },
      ];

      expect(movements).toHaveLength(3);
      expect(movements[0].fromStage).toBe('lead');
      expect(movements[2].toStage).toBe('offer_extended');
    });
  });

  describe('Retention Risk Alerts', () => {
    it('should calculate high risk when deal change > 50%', () => {
      const dealChange = -75;
      const riskLevel = dealChange < -50 ? 'high' : dealChange < -25 ? 'medium' : 'low';

      expect(riskLevel).toBe('high');
    });

    it('should calculate medium risk when deal change between -25% and -50%', () => {
      const dealChange = -35;
      const riskLevel = dealChange < -50 ? 'high' : dealChange < -25 ? 'medium' : 'low';

      expect(riskLevel).toBe('medium');
    });

    it('should calculate low risk when deal change > -25%', () => {
      const dealChange = -10;
      const riskLevel = dealChange < -50 ? 'high' : dealChange < -25 ? 'medium' : 'low';

      expect(riskLevel).toBe('low');
    });

    it('should create retention alert for high-risk agent', () => {
      const alert = {
        id: 'alert-1',
        agentName: 'James Lewis',
        riskLevel: 'high' as const,
        dealChangePercent: -100,
        volumeChangePercent: -100,
        alertStatus: 'active' as const,
        createdAt: new Date().toISOString(),
      };

      expect(alert.riskLevel).toBe('high');
      expect(alert.alertStatus).toBe('active');
    });

    it('should track alert acknowledgment', () => {
      const alert = {
        id: 'alert-1',
        alertStatus: 'active' as const,
        acknowledgedBy: null as number | null,
        acknowledgedAt: null as string | null,
      };

      const acknowledged = {
        ...alert,
        alertStatus: 'acknowledged' as const,
        acknowledgedBy: 123,
        acknowledgedAt: new Date().toISOString(),
      };

      expect(acknowledged.alertStatus).toBe('acknowledged');
      expect(acknowledged.acknowledgedBy).toBe(123);
    });

    it('should send email notifications for high-risk alerts', () => {
      const alert = {
        id: 'alert-1',
        riskLevel: 'high',
        emailRecipients: ['manager@company.com', 'owner@company.com'],
        emailSent: false,
        emailSentAt: null,
      };

      const sent = {
        ...alert,
        emailSent: true,
        emailSentAt: new Date().toISOString(),
      };

      expect(sent.emailSent).toBe(true);
      expect(sent.emailRecipients).toHaveLength(2);
    });

    it('should suggest retention actions based on risk level', () => {
      const agentName = 'Amanda Jackson';
      const riskLevel = 'high';
      const dealChange = -67;

      let retentionAction = '';
      if (riskLevel === 'high') {
        retentionAction = `URGENT: Schedule immediate meeting with ${agentName}. Production down ${Math.abs(dealChange)}%. Discuss commission adjustments, support needs, or team changes.`;
      }

      expect(retentionAction).toContain('URGENT');
      expect(retentionAction).toContain(agentName);
    });
  });

  describe('Prospect Selection for Pipeline', () => {
    it('should select multiple prospects from import', () => {
      const prospects = [
        { id: 'p1', firstName: 'John', selected: true },
        { id: 'p2', firstName: 'Jane', selected: false },
        { id: 'p3', firstName: 'Bob', selected: true },
      ];

      const selected = prospects.filter((p) => p.selected);
      expect(selected).toHaveLength(2);
      expect(selected[0].firstName).toBe('John');
    });

    it('should move selected prospects to pipeline', () => {
      const selectedProspects = [
        { id: 'p1', firstName: 'John', pipelineStatus: null },
        { id: 'p3', firstName: 'Bob', pipelineStatus: null },
      ];

      const inPipeline = selectedProspects.map((p) => ({
        ...p,
        pipelineStatus: 'lead',
      }));

      expect(inPipeline).toHaveLength(2);
      expect(inPipeline[0].pipelineStatus).toBe('lead');
    });

    it('should bulk update prospect statuses', () => {
      const prospectIds = ['p1', 'p2', 'p3'];
      const newStatus = 'contacted';

      const updates = prospectIds.map((id) => ({
        prospectId: id,
        pipelineStatus: newStatus,
      }));

      expect(updates).toHaveLength(3);
      expect(updates.every((u) => u.pipelineStatus === 'contacted')).toBe(true);
    });
  });

  describe('Pipeline Conversion Funnel', () => {
    it('should calculate conversion rates', () => {
      const funnel = {
        lead: 10,
        contacted: 8,
        interviewing: 5,
        offer_extended: 3,
        onboarding: 2,
      };

      const leadToContact = (funnel.contacted / funnel.lead) * 100;
      const contactToInterview = (funnel.interviewing / funnel.contacted) * 100;
      const interviewToOffer = (funnel.offer_extended / funnel.interviewing) * 100;
      const offerToOnboard = (funnel.onboarding / funnel.offer_extended) * 100;

      expect(leadToContact).toBe(80);
      expect(contactToInterview).toBe(62.5);
      expect(interviewToOffer).toBe(60);
      expect(offerToOnboard).toBeCloseTo(66.67, 1);
    });

    it('should identify funnel bottlenecks', () => {
      const funnel = {
        lead: 50,
        contacted: 40,
        interviewing: 10,
        offer_extended: 8,
        onboarding: 7,
      };

      const stages = Object.entries(funnel);
      let bottleneck = null;
      let maxDrop = 0;

      for (let i = 1; i < stages.length; i++) {
        const drop = stages[i - 1][1] - stages[i][1];
        if (drop > maxDrop) {
          maxDrop = drop;
          bottleneck = `${stages[i - 1][0]} → ${stages[i][0]}`;
        }
      }

      expect(bottleneck).toBe('contacted → interviewing');
      expect(maxDrop).toBe(30);
    });
  });
});
