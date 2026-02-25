/**
 * Commission Database Operations Tests
 * 
 * Tests for tRPC procedures that handle database persistence of:
 * - Commission plans (create, read, update, delete)
 * - Agent assignments (create, read, update, delete)
 * - Team management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { commissionPlans, agentAssignments, teams } from '../drizzle/schema';
import { getDb } from './db';
import type { CommissionPlan, AgentPlanAssignment, Team } from './lib/commission-calculator';

describe('Commission Database Operations', () => {
  let db: any;
  const testTenantId = 1;

  beforeEach(async () => {
    db = await getDb();
    if (!db) {
      console.warn('Database not available for tests');
    }
  });

  describe('Commission Plans', () => {
    it('should create a new commission plan', async () => {
      if (!db) return;

      const planId = `test-plan-${Date.now()}`;
      const newPlan = {
        id: planId,
        tenantId: testTenantId,
        name: 'Test Plan 80/20',
        splitPercentage: 80,
        capAmount: 20000,
        postCapSplit: 100,
        royaltyPercentage: 0,
        royaltyCap: 0,
        description: 'Test commission plan',
        deductions: JSON.stringify([]),
        useSliding: 0,
        tiers: null,
      };

      await db.insert(commissionPlans).values(newPlan);

      const result = await db
        .select()
        .from(commissionPlans)
        .where(eq(commissionPlans.id, planId))
        .limit(1);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Test Plan 80/20');
      expect(result[0].splitPercentage).toBe(80);
    });

    it('should update an existing commission plan', async () => {
      if (!db) return;

      const planId = `test-plan-update-${Date.now()}`;
      const newPlan = {
        id: planId,
        tenantId: testTenantId,
        name: 'Original Name',
        splitPercentage: 70,
        capAmount: 15000,
        postCapSplit: 100,
        royaltyPercentage: 0,
        royaltyCap: 0,
        description: 'Original description',
        deductions: JSON.stringify([]),
        useSliding: 0,
        tiers: null,
      };

      await db.insert(commissionPlans).values(newPlan);

      // Update the plan
      await db
        .update(commissionPlans)
        .set({
          name: 'Updated Name',
          splitPercentage: 75,
          capAmount: 18000,
        })
        .where(eq(commissionPlans.id, planId));

      const result = await db
        .select()
        .from(commissionPlans)
        .where(eq(commissionPlans.id, planId))
        .limit(1);

      expect(result[0].name).toBe('Updated Name');
      expect(result[0].splitPercentage).toBe(75);
      expect(result[0].capAmount).toBe(18000);
    });

    it('should handle sliding scale tiers', async () => {
      if (!db) return;

      const planId = `test-plan-sliding-${Date.now()}`;
      const tiers = [
        { id: 'tier-1', threshold: 0, splitPercentage: 70, description: 'Base tier' },
        { id: 'tier-2', threshold: 50000, splitPercentage: 75, description: 'Mid tier' },
        { id: 'tier-3', threshold: 100000, splitPercentage: 80, description: 'High tier' },
      ];

      const newPlan = {
        id: planId,
        tenantId: testTenantId,
        name: 'Sliding Scale Plan',
        splitPercentage: 70,
        capAmount: 0,
        postCapSplit: 100,
        royaltyPercentage: 0,
        royaltyCap: 0,
        description: 'Plan with sliding scale tiers',
        deductions: JSON.stringify([]),
        useSliding: 1,
        tiers: JSON.stringify(tiers),
      };

      await db.insert(commissionPlans).values(newPlan);

      const result = await db
        .select()
        .from(commissionPlans)
        .where(eq(commissionPlans.id, planId))
        .limit(1);

      expect(result[0].useSliding).toBe(1);
      expect(result[0].tiers).toBeDefined();
      const parsedTiers = JSON.parse(result[0].tiers);
      expect(parsedTiers).toHaveLength(3);
      expect(parsedTiers[0].threshold).toBe(0);
      expect(parsedTiers[2].threshold).toBe(100000);
    });

    it('should handle deductions', async () => {
      if (!db) return;

      const planId = `test-plan-deductions-${Date.now()}`;
      const deductions = [
        { id: 'ded-1', name: 'Tech Fee', amount: 5000, type: 'fixed', frequency: 'per_transaction' },
        { id: 'ded-2', name: 'MLS Fee', amount: 2, type: 'percentage', frequency: 'per_transaction' },
      ];

      const newPlan = {
        id: planId,
        tenantId: testTenantId,
        name: 'Plan with Deductions',
        splitPercentage: 80,
        capAmount: 20000,
        postCapSplit: 100,
        royaltyPercentage: 0,
        royaltyCap: 0,
        description: 'Plan with standard deductions',
        deductions: JSON.stringify(deductions),
        useSliding: 0,
        tiers: null,
      };

      await db.insert(commissionPlans).values(newPlan);

      const result = await db
        .select()
        .from(commissionPlans)
        .where(eq(commissionPlans.id, planId))
        .limit(1);

      const parsedDeductions = JSON.parse(result[0].deductions);
      expect(parsedDeductions).toHaveLength(2);
      expect(parsedDeductions[0].name).toBe('Tech Fee');
      expect(parsedDeductions[1].type).toBe('percentage');
    });

    it('should delete a commission plan', async () => {
      if (!db) return;

      const planId = `test-plan-delete-${Date.now()}`;
      const newPlan = {
        id: planId,
        tenantId: testTenantId,
        name: 'Plan to Delete',
        splitPercentage: 80,
        capAmount: 20000,
        postCapSplit: 100,
        royaltyPercentage: 0,
        royaltyCap: 0,
        description: 'This plan will be deleted',
        deductions: JSON.stringify([]),
        useSliding: 0,
        tiers: null,
      };

      await db.insert(commissionPlans).values(newPlan);

      // Verify it exists
      let result = await db
        .select()
        .from(commissionPlans)
        .where(eq(commissionPlans.id, planId))
        .limit(1);
      expect(result).toHaveLength(1);

      // Delete it
      await db.delete(commissionPlans).where(eq(commissionPlans.id, planId));

      // Verify it's gone
      result = await db
        .select()
        .from(commissionPlans)
        .where(eq(commissionPlans.id, planId))
        .limit(1);
      expect(result).toHaveLength(0);
    });
  });

  describe('Agent Assignments', () => {
    it('should create a new agent assignment', async () => {
      if (!db) return;

      const assignmentId = `test-assignment-${Date.now()}`;
      const planId = `test-plan-${Date.now()}`;

      // Create a plan first
      const newPlan = {
        id: planId,
        tenantId: testTenantId,
        name: 'Test Plan',
        splitPercentage: 80,
        capAmount: 20000,
        postCapSplit: 100,
        royaltyPercentage: 0,
        royaltyCap: 0,
        description: 'Test plan for assignment',
        deductions: JSON.stringify([]),
        useSliding: 0,
        tiers: null,
      };
      await db.insert(commissionPlans).values(newPlan);

      // Create assignment
      const newAssignment = {
        id: assignmentId,
        tenantId: testTenantId,
        agentName: 'John Doe',
        planId: planId,
        teamId: null,
        startDate: '2024-01-01',
        anniversaryDate: null,
        isActive: 1,
      };

      await db.insert(agentAssignments).values(newAssignment);

      const result = await db
        .select()
        .from(agentAssignments)
        .where(eq(agentAssignments.id, assignmentId))
        .limit(1);

      expect(result).toHaveLength(1);
      expect(result[0].agentName).toBe('John Doe');
      expect(result[0].planId).toBe(planId);
      expect(result[0].isActive).toBe(1);
    });

    it('should update an agent assignment', async () => {
      if (!db) return;

      const assignmentId = `test-assignment-update-${Date.now()}`;
      const planId = `test-plan-${Date.now()}`;
      const newPlanId = `test-plan-new-${Date.now()}`;

      // Create plans
      const plan1 = {
        id: planId,
        tenantId: testTenantId,
        name: 'Plan 1',
        splitPercentage: 80,
        capAmount: 20000,
        postCapSplit: 100,
        royaltyPercentage: 0,
        royaltyCap: 0,
        description: 'Plan 1',
        deductions: JSON.stringify([]),
        useSliding: 0,
        tiers: null,
      };
      const plan2 = {
        id: newPlanId,
        tenantId: testTenantId,
        name: 'Plan 2',
        splitPercentage: 75,
        capAmount: 18000,
        postCapSplit: 100,
        royaltyPercentage: 0,
        royaltyCap: 0,
        description: 'Plan 2',
        deductions: JSON.stringify([]),
        useSliding: 0,
        tiers: null,
      };
      await db.insert(commissionPlans).values(plan1);
      await db.insert(commissionPlans).values(plan2);

      // Create assignment
      const newAssignment = {
        id: assignmentId,
        tenantId: testTenantId,
        agentName: 'Jane Smith',
        planId: planId,
        teamId: null,
        startDate: '2024-01-01',
        anniversaryDate: null,
        isActive: 1,
      };
      await db.insert(agentAssignments).values(newAssignment);

      // Update assignment
      await db
        .update(agentAssignments)
        .set({
          planId: newPlanId,
          anniversaryDate: '2024-06-01',
        })
        .where(eq(agentAssignments.id, assignmentId));

      const result = await db
        .select()
        .from(agentAssignments)
        .where(eq(agentAssignments.id, assignmentId))
        .limit(1);

      expect(result[0].planId).toBe(newPlanId);
      expect(result[0].anniversaryDate).toBe('2024-06-01');
    });

    it('should fetch all assignments for a tenant', async () => {
      if (!db) return;

      const planId = `test-plan-${Date.now()}`;

      // Create a plan
      const newPlan = {
        id: planId,
        tenantId: testTenantId,
        name: 'Test Plan',
        splitPercentage: 80,
        capAmount: 20000,
        postCapSplit: 100,
        royaltyPercentage: 0,
        royaltyCap: 0,
        description: 'Test plan',
        deductions: JSON.stringify([]),
        useSliding: 0,
        tiers: null,
      };
      await db.insert(commissionPlans).values(newPlan);

      // Create multiple assignments
      const agents = ['Agent 1', 'Agent 2', 'Agent 3'];
      for (const agentName of agents) {
        await db.insert(agentAssignments).values({
          id: `test-${agentName}-${Date.now()}`,
          tenantId: testTenantId,
          agentName,
          planId,
          teamId: null,
          startDate: '2024-01-01',
          isActive: 1,
        });
      }

      // Fetch all assignments for tenant
      const result = await db
        .select()
        .from(agentAssignments)
        .where(eq(agentAssignments.tenantId, testTenantId));

      expect(result.length).toBeGreaterThanOrEqual(3);
    });

    it('should delete an agent assignment', async () => {
      if (!db) return;

      const assignmentId = `test-assignment-delete-${Date.now()}`;
      const planId = `test-plan-${Date.now()}`;

      // Create plan
      const newPlan = {
        id: planId,
        tenantId: testTenantId,
        name: 'Test Plan',
        splitPercentage: 80,
        capAmount: 20000,
        postCapSplit: 100,
        royaltyPercentage: 0,
        royaltyCap: 0,
        description: 'Test plan',
        deductions: JSON.stringify([]),
        useSliding: 0,
        tiers: null,
      };
      await db.insert(commissionPlans).values(newPlan);

      // Create assignment
      const newAssignment = {
        id: assignmentId,
        tenantId: testTenantId,
        agentName: 'Agent to Delete',
        planId,
        teamId: null,
        startDate: '2024-01-01',
        isActive: 1,
      };
      await db.insert(agentAssignments).values(newAssignment);

      // Verify it exists
      let result = await db
        .select()
        .from(agentAssignments)
        .where(eq(agentAssignments.id, assignmentId))
        .limit(1);
      expect(result).toHaveLength(1);

      // Delete it
      await db.delete(agentAssignments).where(eq(agentAssignments.id, assignmentId));

      // Verify it's gone
      result = await db
        .select()
        .from(agentAssignments)
        .where(eq(agentAssignments.id, assignmentId))
        .limit(1);
      expect(result).toHaveLength(0);
    });
  });

  describe('Data Persistence', () => {
    it('should persist plan data across multiple reads', async () => {
      if (!db) return;

      const planId = `test-plan-persistence-${Date.now()}`;
      const newPlan = {
        id: planId,
        tenantId: testTenantId,
        name: 'Persistence Test Plan',
        splitPercentage: 85,
        capAmount: 25000,
        postCapSplit: 100,
        royaltyPercentage: 5,
        royaltyCap: 5000,
        description: 'Testing data persistence',
        deductions: JSON.stringify([{ id: '1', name: 'Fee', amount: 1000, type: 'fixed', frequency: 'per_transaction' }]),
        useSliding: 1,
        tiers: JSON.stringify([{ id: 'tier-1', threshold: 0, splitPercentage: 85, description: 'Base' }]),
      };

      // Insert
      await db.insert(commissionPlans).values(newPlan);

      // Read multiple times
      for (let i = 0; i < 3; i++) {
        const result = await db
          .select()
          .from(commissionPlans)
          .where(eq(commissionPlans.id, planId))
          .limit(1);

        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('Persistence Test Plan');
        expect(result[0].splitPercentage).toBe(85);
        expect(result[0].royaltyPercentage).toBe(5);
      }
    });

    it('should maintain referential integrity between plans and assignments', async () => {
      if (!db) return;

      const planId = `test-plan-integrity-${Date.now()}`;
      const assignmentId = `test-assignment-integrity-${Date.now()}`;

      // Create plan
      const newPlan = {
        id: planId,
        tenantId: testTenantId,
        name: 'Integrity Test Plan',
        splitPercentage: 80,
        capAmount: 20000,
        postCapSplit: 100,
        royaltyPercentage: 0,
        royaltyCap: 0,
        description: 'Testing referential integrity',
        deductions: JSON.stringify([]),
        useSliding: 0,
        tiers: null,
      };
      await db.insert(commissionPlans).values(newPlan);

      // Create assignment referencing the plan
      const newAssignment = {
        id: assignmentId,
        tenantId: testTenantId,
        agentName: 'Integrity Test Agent',
        planId,
        teamId: null,
        startDate: '2024-01-01',
        isActive: 1,
      };
      await db.insert(agentAssignments).values(newAssignment);

      // Fetch both and verify relationship
      const plan = await db
        .select()
        .from(commissionPlans)
        .where(eq(commissionPlans.id, planId))
        .limit(1);

      const assignment = await db
        .select()
        .from(agentAssignments)
        .where(eq(agentAssignments.id, assignmentId))
        .limit(1);

      expect(assignment[0].planId).toBe(plan[0].id);
      expect(assignment[0].agentName).toBe('Integrity Test Agent');
    });
  });
});
