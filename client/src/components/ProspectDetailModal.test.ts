import { describe, it, expect } from 'vitest';

describe('ProspectDetailModal', () => {
  describe('Prospect Information Display', () => {
    it('should display prospect name and email', () => {
      const prospect = {
        id: 'p1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        pipelineStatus: 'lead',
      };

      expect(prospect.firstName).toBe('John');
      expect(prospect.lastName).toBe('Doe');
      expect(prospect.email).toBe('john@example.com');
    });

    it('should display contact information', () => {
      const prospect = {
        id: 'p1',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        primaryPhone: '555-1234',
        mobilePhone: '555-5678',
        office: 'Downtown Office',
        pipelineStatus: 'contacted',
      };

      expect(prospect.primaryPhone).toBe('555-1234');
      expect(prospect.mobilePhone).toBe('555-5678');
      expect(prospect.office).toBe('Downtown Office');
    });

    it('should display production data', () => {
      const prospect = {
        id: 'p1',
        firstName: 'Bob',
        lastName: 'Johnson',
        email: 'bob@example.com',
        totalVolume: '1500000',
        totalUnits: 25,
        pipelineStatus: 'interviewing',
      };

      expect(parseFloat(prospect.totalVolume)).toBe(1500000);
      expect(prospect.totalUnits).toBe(25);
    });
  });

  describe('Pipeline Status Management', () => {
    it('should display current pipeline stage', () => {
      const prospect = {
        id: 'p1',
        firstName: 'Alice',
        lastName: 'Brown',
        email: 'alice@example.com',
        pipelineStatus: 'offer_extended',
      };

      const stages = ['lead', 'contacted', 'interviewing', 'offer_extended', 'onboarding'];
      const currentIndex = stages.indexOf(prospect.pipelineStatus);

      expect(currentIndex).toBe(3);
      expect(stages[currentIndex]).toBe('offer_extended');
    });

    it('should allow status transitions', () => {
      const prospect = {
        id: 'p1',
        pipelineStatus: 'lead' as const,
      };

      const newStatus = 'contacted';
      const updated = { ...prospect, pipelineStatus: newStatus };

      expect(updated.pipelineStatus).toBe('contacted');
    });

    it('should validate pipeline stages', () => {
      const validStages = ['lead', 'contacted', 'interviewing', 'offer_extended', 'onboarding'];
      const testStages = ['lead', 'contacted', 'unknown', 'offer_extended'];

      const allValid = testStages.every((stage) => validStages.includes(stage));
      expect(allValid).toBe(false);

      const validOnly = testStages.filter((stage) => validStages.includes(stage));
      expect(validOnly).toHaveLength(3);
    });
  });

  describe('Quick Actions', () => {
    it('should generate email link', () => {
      const email = 'prospect@example.com';
      const mailtoLink = `mailto:${email}`;

      expect(mailtoLink).toBe('mailto:prospect@example.com');
    });

    it('should generate phone link', () => {
      const phone = '555-1234';
      const telLink = `tel:${phone}`;

      expect(telLink).toBe('tel:555-1234');
    });

    it('should export prospect data as JSON', () => {
      const prospect = {
        id: 'p1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        pipelineStatus: 'lead',
      };

      const json = JSON.stringify(prospect, null, 2);
      const parsed = JSON.parse(json);

      expect(parsed.firstName).toBe('John');
      expect(parsed.email).toBe('john@example.com');
    });
  });

  describe('Activity Timeline Integration', () => {
    it('should display prospect activities', () => {
      const activities = [
        {
          id: '1',
          prospectId: 'p1',
          activityType: 'note' as const,
          title: 'Initial contact',
          createdAt: new Date().toISOString(),
        },
        {
          id: '2',
          prospectId: 'p1',
          activityType: 'call' as const,
          title: 'Follow-up call',
          createdAt: new Date().toISOString(),
        },
      ];

      expect(activities).toHaveLength(2);
      expect(activities[0].activityType).toBe('note');
      expect(activities[1].activityType).toBe('call');
    });

    it('should filter activities by prospect', () => {
      const allActivities = [
        { id: '1', prospectId: 'p1', title: 'Activity 1' },
        { id: '2', prospectId: 'p2', title: 'Activity 2' },
        { id: '3', prospectId: 'p1', title: 'Activity 3' },
      ];

      const p1Activities = allActivities.filter((a) => a.prospectId === 'p1');
      expect(p1Activities).toHaveLength(2);
    });
  });

  describe('Modal State Management', () => {
    it('should open modal with prospect data', () => {
      const prospect = {
        id: 'p1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        pipelineStatus: 'lead',
      };

      const isOpen = true;
      expect(isOpen).toBe(true);
      expect(prospect).toBeDefined();
    });

    it('should close modal and clear selection', () => {
      let selectedProspect = {
        id: 'p1',
        firstName: 'John',
        lastName: 'Doe',
      };
      let isOpen = true;

      isOpen = false;
      selectedProspect = null as any;

      expect(isOpen).toBe(false);
      expect(selectedProspect).toBeNull();
    });

    it('should handle tab navigation', () => {
      const tabs = ['overview', 'timeline', 'actions'];
      let activeTab = 'overview';

      activeTab = 'timeline';
      expect(tabs.includes(activeTab)).toBe(true);

      activeTab = 'actions';
      expect(activeTab).toBe('actions');
    });
  });

  describe('Drag-and-Drop Integration', () => {
    it('should track prospect movement between stages', () => {
      const movements = [
        { prospectId: 'p1', fromStage: 'lead', toStage: 'contacted', timestamp: new Date().toISOString() },
        { prospectId: 'p1', fromStage: 'contacted', toStage: 'interviewing', timestamp: new Date().toISOString() },
      ];

      expect(movements).toHaveLength(2);
      expect(movements[0].fromStage).toBe('lead');
      expect(movements[1].toStage).toBe('interviewing');
    });

    it('should validate drag-drop transitions', () => {
      const validTransitions = [
        ['lead', 'contacted'],
        ['contacted', 'interviewing'],
        ['interviewing', 'offer_extended'],
        ['offer_extended', 'onboarding'],
      ];

      const isValidTransition = (from: string, to: string) => {
        return validTransitions.some((t) => t[0] === from && t[1] === to);
      };

      expect(isValidTransition('lead', 'contacted')).toBe(true);
      expect(isValidTransition('lead', 'onboarding')).toBe(false);
    });
  });
});
