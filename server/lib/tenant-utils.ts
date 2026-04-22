import { getDb } from '../db';
import { users } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

/**
 * Get the primary tenant ID for a user
 * Returns the tenantId as a number (matches schema type)
 */
export async function getTenantIdFromUser(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  // Get the user to verify they exist
  const userRecords = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  
  if (!userRecords || userRecords.length === 0) {
    throw new Error('User not found');
  }
  
  // Return the tenantId as a number
  return userRecords[0].tenantId;
}

/**
 * Get all tenant IDs for a user (for multi-tenant support)
 */
export async function getAllTenantIdsForUser(userId: number): Promise<number[]> {
  // For now, return the single tenant ID
  const tenantId = await getTenantIdFromUser(userId);
  return [tenantId];
}
