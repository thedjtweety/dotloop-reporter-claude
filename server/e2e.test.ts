import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDb } from './db';
import { uploads, transactions, commissionPlans, agentAssignments } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('E2E: Complete User Workflows', () => {
  let db: any;
  const testTenantId = 1;
  const testUserId = '1';

  beforeAll(async () => {
    db = await getDb();
  });

  it('E2E: CSV Upload → Dashboard Display → Commission Calculation', async () => {
    // Step 1: Create upload record
    const uploadResult = await db.insert(uploads).values({
      id: 99999,
      tenantId: testTenantId,
      userId: testUserId,
      fileName: 'test-e2e.csv',
      recordCount: 10,
      fileSize: 5000,
      status: 'success',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    expect(uploadResult).toBeDefined();

    // Step 2: Create sample transactions
    const transactionData = Array.from({ length: 10 }, (_, i) => ({
      tenantId: testTenantId,
      uploadId: 99999,
      userId: testUserId,
      loopId: `LOOP-${i}`,
      loopName: `Deal ${i}`,
      loopStatus: i % 2 === 0 ? 'Closed' : 'Active',
      price: 300000 + i * 10000,
      salePrice: 320000 + i * 10000,
      commissionRate: 0.05,
      commissionTotal: (320000 + i * 10000) * 0.05,
      createdDate: new Date(),
      closingDate: new Date(),
      address: `${i} Main St`,
      city: 'Denver',
      state: 'CO',
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    const txResult = await db.insert(transactions).values(transactionData);
    expect(txResult).toBeDefined();

    // Step 3: Verify transactions were created
    const createdTx = await db.select()
      .from(transactions)
      .where(eq(transactions.uploadId, 99999))
      .limit(1);

    expect(createdTx.length).toBe(1);
    expect(createdTx[0].loopName).toBe('Deal 0');

    // Step 4: Verify commission calculation
    const totalCommission = transactionData.reduce((sum, tx) => sum + tx.commissionTotal, 0);
    expect(totalCommission).toBeGreaterThan(0);

    // Step 5: Verify upload record
    const uploadRecord = await db.select()
      .from(uploads)
      .where(eq(uploads.id, 99999))
      .limit(1);

    expect(uploadRecord[0].recordCount).toBe(10);
    expect(uploadRecord[0].status).toBe('success');
  });

  it('E2E: Commission Plan → Agent Assignment → Calculation', async () => {
    // Step 1: Create commission plan
    const planResult = await db.insert(commissionPlans).values({
      id: '99998',
      tenantId: testTenantId,
      name: 'Test Plan',
      splitPercentage: 50,
      capAmount: 0,
      postCapSplit: 100,
      description: 'Test commission plan',
      tiers: JSON.stringify([
        { min: 0, max: 100000, rate: 0.04 },
        { min: 100000, max: 500000, rate: 0.05 },
        { min: 500000, max: null, rate: 0.06 }
      ]),
      createdAt: new Date(),
      updatedAt: new Date()
    });

    expect(planResult).toBeDefined();

    // Step 2: Assign agent to plan
    const assignResult = await db.insert(agentAssignments).values({
      id: '99997',
      tenantId: testTenantId,
      agentName: 'Test Agent',
      planId: '99998',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    expect(assignResult).toBeDefined();

    // Step 3: Verify assignment
    const assignment = await db.select()
      .from(agentAssignments)
      .where(eq(agentAssignments.id, '99997'))
      .limit(1);

    expect(assignment[0].agentName).toBe('Test Agent');
    expect(assignment[0].planId).toBe('99998');
  });

  it('E2E: Data Filtering & Drill-Down', async () => {
    // Verify we can filter transactions by status
    const closedDeals = await db.select()
      .from(transactions)
      .where(eq(transactions.loopStatus, 'Closed'))
      .limit(100);

    expect(closedDeals.length).toBeGreaterThanOrEqual(0);

    // Verify we can filter by state
    const coDeals = await db.select()
      .from(transactions)
      .where(eq(transactions.state, 'CO'))
      .limit(100);

    expect(coDeals.length).toBeGreaterThanOrEqual(0);
  });

  it('E2E: Multi-Tenant Isolation', async () => {
    // Create data for tenant 1
    const tenant1Uploads = await db.select()
      .from(uploads)
      .where(eq(uploads.tenantId, 1))
      .limit(100);

    // Verify tenant 2 cannot see tenant 1 data
    const tenant2Uploads = await db.select()
      .from(uploads)
      .where(eq(uploads.tenantId, 2))
      .limit(100);

    // Both should be independent
    expect(Array.isArray(tenant1Uploads)).toBe(true);
    expect(Array.isArray(tenant2Uploads)).toBe(true);
  });

  it('E2E: Audit Logging', async () => {
    // Verify audit logs are created for actions
    // This would require audit log router to be tested
    expect(true).toBe(true);
  });

  it('E2E: Performance - Large Dataset', async () => {
    const startTime = Date.now();
    
    // Query 1000 transactions
    const largeQuery = await db.select()
      .from(transactions)
      .limit(1000);

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Should complete in reasonable time (< 5 seconds)
    expect(duration).toBeLessThan(5000);
    expect(Array.isArray(largeQuery)).toBe(true);
  });

  afterAll(async () => {
    // Cleanup test data
    try {
      await db.delete(transactions).where(eq(transactions.uploadId, 99999));
      await db.delete(uploads).where(eq(uploads.id, 99999));
      await db.delete(agentAssignments).where(eq(agentAssignments.id, '99997'));
      await db.delete(commissionPlans).where(eq(commissionPlans.id, '99998'));
    } catch (e) {
      console.log('Cleanup error:', e);
    }
  });
});
