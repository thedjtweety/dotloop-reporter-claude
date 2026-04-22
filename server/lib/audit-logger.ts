/**
 * Audit Logging Helper
 * Tracks all user actions and data changes for compliance and debugging
 */

import { getDb } from '../db';
import { auditLogs, tokenAuditLogs } from '../../drizzle/schema';

export type AuditAction =
  | 'user_created'
  | 'user_deleted'
  | 'user_role_changed'
  | 'upload_deleted'
  | 'upload_viewed'
  | 'settings_changed'
  | 'data_exported'
  | 'tenant_settings_changed'
  | 'oauth_connected'
  | 'oauth_disconnected';

export type AuditTargetType = 'user' | 'upload' | 'system' | 'tenant';

export interface AuditLogEntry {
  tenantId: number;
  adminId: number;
  adminName: string;
  adminEmail?: string;
  action: AuditAction;
  targetType?: AuditTargetType;
  targetId?: number;
  targetName?: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface TokenAuditLogEntry {
  tenantId: number;
  userId?: number;
  tokenId?: number;
  action: 'token_created' | 'token_refreshed' | 'token_used' | 'token_revoked' | 'token_decryption_failed' | 'suspicious_access' | 'rate_limit_exceeded' | 'security_alert';
  status: 'success' | 'failure' | 'warning';
  errorMessage?: string;
  ipAddress: string;
  userAgent?: string;
}

/**
 * Log an audit event
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    const db = await getDb();
    if (!db) {
      console.error('Database connection failed for audit logging');
      return;
    }

    await db.insert(auditLogs).values({
      tenantId: entry.tenantId,
      adminId: entry.adminId,
      adminName: entry.adminName,
      adminEmail: entry.adminEmail,
      action: entry.action as any,
      targetType: entry.targetType as any,
      targetId: entry.targetId,
      targetName: entry.targetName,
      details: entry.details,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
    });

    console.log(`[Audit] ${entry.action} by ${entry.adminName} on ${entry.targetType}:${entry.targetId}`);
  } catch (error) {
    console.error('Error logging audit event:', error);
  }
}

/**
 * Log a token audit event
 */
export async function logTokenAuditEvent(entry: TokenAuditLogEntry): Promise<void> {
  try {
    const db = await getDb();
    if (!db) {
      console.error('Database connection failed for token audit logging');
      return;
    }

    await db.insert(tokenAuditLogs).values({
      tenantId: entry.tenantId,
      userId: entry.userId,
      tokenId: entry.tokenId,
      action: entry.action as any,
      status: entry.status as any,
      errorMessage: entry.errorMessage,
      ipAddress: entry.ipAddress || '',
      userAgent: entry.userAgent,
    });

    console.log(`[Token Audit] ${entry.action} (${entry.status}) for user ${entry.userId}`);
  } catch (error) {
    console.error('Error logging token audit event:', error);
  }
}

/**
 * Get audit logs for a tenant
 */
export async function getAuditLogs(
  tenantId: number,
  limit: number = 100,
  offset: number = 0
): Promise<any[]> {
  try {
    const db = await getDb();
    if (!db) {
      console.error('Database connection failed');
      return [];
    }

    const { eq } = await import('drizzle-orm');
    const logs = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.tenantId, tenantId))
      .orderBy(auditLogs.createdAt)
      .limit(limit)
      .offset(offset);

    return logs;
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return [];
  }
}

/**
 * Get token audit logs for a user
 */
export async function getTokenAuditLogs(
  tenantId: number,
  userId: number,
  limit: number = 50,
  offset: number = 0
): Promise<any[]> {
  try {
    const db = await getDb();
    if (!db) {
      console.error('Database connection failed');
      return [];
    }

    const { eq, and } = await import('drizzle-orm');
    const logs = await db
      .select()
      .from(tokenAuditLogs)
      .where(and(eq(tokenAuditLogs.tenantId, tenantId), eq(tokenAuditLogs.userId, userId)))
      .orderBy(tokenAuditLogs.createdAt)
      .limit(limit)
      .offset(offset);

    return logs;
  } catch (error) {
    console.error('Error fetching token audit logs:', error);
    return [];
  }
}

/**
 * Get audit logs by action
 */
export async function getAuditLogsByAction(
  tenantId: number,
  action: AuditAction,
  limit: number = 50
): Promise<any[]> {
  try {
    const db = await getDb();
    if (!db) {
      console.error('Database connection failed');
      return [];
    }

    const { eq, and } = await import('drizzle-orm');
    const logs = await db
      .select()
      .from(auditLogs)
      .where(and(eq(auditLogs.tenantId, tenantId), eq(auditLogs.action, action as any)))
      .orderBy(auditLogs.createdAt)
      .limit(limit);

    return logs;
  } catch (error) {
    console.error('Error fetching audit logs by action:', error);
    return [];
  }
}

/**
 * Get audit logs by user
 */
export async function getAuditLogsByUser(
  tenantId: number,
  adminId: number,
  limit: number = 50
): Promise<any[]> {
  try {
    const db = await getDb();
    if (!db) {
      console.error('Database connection failed');
      return [];
    }

    const { eq, and } = await import('drizzle-orm');
    const logs = await db
      .select()
      .from(auditLogs)
      .where(and(eq(auditLogs.tenantId, tenantId), eq(auditLogs.adminId, adminId)))
      .orderBy(auditLogs.createdAt)
      .limit(limit);

    return logs;
  } catch (error) {
    console.error('Error fetching audit logs by user:', error);
    return [];
  }
}

/**
 * Export audit logs as CSV
 */
export async function exportAuditLogsAsCSV(tenantId: number): Promise<string> {
  try {
    const logs = await getAuditLogs(tenantId, 10000);

    const headers = [
      'Timestamp',
      'User',
      'Email',
      'Action',
      'Target Type',
      'Target ID',
      'Target Name',
      'Details',
      'IP Address',
    ];

    const rows = logs.map((log: any) => [
      log.createdAt,
      log.adminName,
      log.adminEmail || '',
      log.action,
      log.targetType || '',
      log.targetId || '',
      log.targetName || '',
      log.details || '',
      log.ipAddress || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row: any[]) => row.map((cell: any) => `"${cell}"`).join(',')),
    ].join('\n');

    return csvContent;
  } catch (error) {
    console.error('Error exporting audit logs:', error);
    return '';
  }
}
