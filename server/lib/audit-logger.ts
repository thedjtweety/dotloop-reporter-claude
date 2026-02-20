/**
 * Audit Logging System
 * 
 * Comprehensive audit logging for security-critical actions.
 * Logs are stored in the database for compliance and forensic analysis.
 * 
 * @module lib/audit-logger
 * 
 * ## What Gets Logged
 * - User authentication (login, logout, failed attempts)
 * - User management (creation, deletion, role changes)
 * - Data access (viewing sensitive commission data)
 * - Data modification (uploads, deletions, updates)
 * - Admin actions (settings changes, user management)
 * - Security events (rate limit violations, CSRF failures)
 * 
 * ## Log Retention
 * - Audit logs are retained for 90 days by default
 * - Critical security events are retained for 1 year
 * - Logs can be exported for compliance purposes
 */

import { getDb } from '../db';
import { auditLogs } from '../../drizzle/schema';
import type { Request } from 'express';

/**
 * Audit action types
 * These correspond to the enum in the database schema
 */
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
  | 'oauth_disconnected'
  | 'commission_viewed'
  | 'commission_plan_created'
  | 'commission_plan_updated'
  | 'commission_plan_deleted'
  | 'agent_assigned_to_plan'
  | 'login_success'
  | 'login_failed'
  | 'logout'
  | 'password_reset'
  | 'rate_limit_exceeded'
  | 'csrf_failure'
  | 'unauthorized_access'
  | 'permission_denied';

/**
 * Target types for audit logs
 */
export type AuditTargetType = 'user' | 'upload' | 'system' | 'tenant' | 'commission_plan' | 'agent';

/**
 * Audit log entry structure
 */
export interface AuditLogEntry {
  tenantId: number;
  adminId: number;
  adminName: string;
  adminEmail?: string | null;
  action: AuditAction;
  targetType?: AuditTargetType | null;
  targetId?: number | null;
  targetName?: string | null;
  details?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Extract IP address from request
 */
function getIpAddress(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

/**
 * Extract user agent from request
 */
function getUserAgent(req: Request): string {
  return req.headers['user-agent'] || 'unknown';
}

/**
 * Log an audit event
 * 
 * @param entry - Audit log entry
 * @returns Promise that resolves when log is written
 * 
 * @example
 * ```typescript
 * await logAudit({
 *   tenantId: 1,
 *   adminId: user.id,
 *   adminName: user.name,
 *   adminEmail: user.email,
 *   action: 'user_role_changed',
 *   targetType: 'user',
 *   targetId: targetUser.id,
 *   targetName: targetUser.name,
 *   details: JSON.stringify({ oldRole: 'agent', newRole: 'broker' }),
 *   ipAddress: getIpAddress(req),
 *   userAgent: getUserAgent(req),
 * });
 * ```
 */
export async function logAudit(entry: AuditLogEntry): Promise<void> {
  try {
    const db = await getDb();
    if (!db) {
      console.error('[AUDIT] Database unavailable, cannot log audit event');
      return;
    }

    await db.insert(auditLogs).values({
      tenantId: entry.tenantId,
      adminId: entry.adminId,
      adminName: entry.adminName,
      adminEmail: entry.adminEmail,
      action: entry.action as any, // Cast to match schema enum
      targetType: entry.targetType as any,
      targetId: entry.targetId,
      targetName: entry.targetName,
      details: entry.details,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
    });

    console.log(`[AUDIT] ${entry.action} by ${entry.adminName} (ID: ${entry.adminId})`);
  } catch (error) {
    console.error('[AUDIT] Failed to log audit event:', error);
    // Don't throw - we don't want audit logging failures to break the application
  }
}

/**
 * Log user authentication event
 * 
 * @param req - Express request object
 * @param userId - User ID
 * @param userName - User name
 * @param userEmail - User email
 * @param tenantId - Tenant ID
 * @param success - Whether authentication was successful
 */
export async function logAuthEvent(
  req: Request,
  userId: number,
  userName: string,
  userEmail: string | null,
  tenantId: number,
  success: boolean
): Promise<void> {
  await logAudit({
    tenantId,
    adminId: userId,
    adminName: userName,
    adminEmail: userEmail,
    action: success ? 'login_success' : 'login_failed',
    targetType: 'user',
    targetId: userId,
    targetName: userName,
    details: success ? 'Successful login' : 'Failed login attempt',
    ipAddress: getIpAddress(req),
    userAgent: getUserAgent(req),
  });
}

/**
 * Log user management action
 * 
 * @param req - Express request object
 * @param adminId - Admin user ID performing the action
 * @param adminName - Admin user name
 * @param adminEmail - Admin user email
 * @param tenantId - Tenant ID
 * @param action - Action type
 * @param targetUserId - Target user ID
 * @param targetUserName - Target user name
 * @param details - Additional details
 */
export async function logUserManagement(
  req: Request,
  adminId: number,
  adminName: string,
  adminEmail: string | null,
  tenantId: number,
  action: 'user_created' | 'user_deleted' | 'user_role_changed',
  targetUserId: number,
  targetUserName: string,
  details?: Record<string, any>
): Promise<void> {
  await logAudit({
    tenantId,
    adminId,
    adminName,
    adminEmail,
    action,
    targetType: 'user',
    targetId: targetUserId,
    targetName: targetUserName,
    details: details ? JSON.stringify(details) : null,
    ipAddress: getIpAddress(req),
    userAgent: getUserAgent(req),
  });
}

/**
 * Log data access event
 * 
 * @param req - Express request object
 * @param userId - User ID accessing data
 * @param userName - User name
 * @param userEmail - User email
 * @param tenantId - Tenant ID
 * @param action - Action type
 * @param targetType - Type of data accessed
 * @param targetId - ID of data accessed
 * @param targetName - Name/description of data accessed
 * @param details - Additional details
 */
export async function logDataAccess(
  req: Request,
  userId: number,
  userName: string,
  userEmail: string | null,
  tenantId: number,
  action: 'upload_viewed' | 'commission_viewed' | 'data_exported',
  targetType: AuditTargetType,
  targetId: number,
  targetName: string,
  details?: Record<string, any>
): Promise<void> {
  await logAudit({
    tenantId,
    adminId: userId,
    adminName: userName,
    adminEmail: userEmail,
    action,
    targetType,
    targetId,
    targetName,
    details: details ? JSON.stringify(details) : null,
    ipAddress: getIpAddress(req),
    userAgent: getUserAgent(req),
  });
}

/**
 * Log security event
 * 
 * @param req - Express request object
 * @param userId - User ID (if authenticated)
 * @param userName - User name (if authenticated)
 * @param tenantId - Tenant ID (if authenticated)
 * @param action - Security event type
 * @param details - Additional details
 */
export async function logSecurityEvent(
  req: Request,
  userId: number | null,
  userName: string | null,
  tenantId: number | null,
  action: 'rate_limit_exceeded' | 'csrf_failure' | 'unauthorized_access' | 'permission_denied',
  details?: Record<string, any>
): Promise<void> {
  await logAudit({
    tenantId: tenantId || 0, // Use 0 for unauthenticated requests
    adminId: userId || 0,
    adminName: userName || 'Anonymous',
    adminEmail: null,
    action,
    targetType: 'system',
    details: details ? JSON.stringify(details) : null,
    ipAddress: getIpAddress(req),
    userAgent: getUserAgent(req),
  });
}

/**
 * Log commission plan action
 * 
 * @param req - Express request object
 * @param userId - User ID performing action
 * @param userName - User name
 * @param userEmail - User email
 * @param tenantId - Tenant ID
 * @param action - Action type
 * @param planId - Commission plan ID
 * @param planName - Commission plan name
 * @param details - Additional details
 */
export async function logCommissionPlanAction(
  req: Request,
  userId: number,
  userName: string,
  userEmail: string | null,
  tenantId: number,
  action: 'commission_plan_created' | 'commission_plan_updated' | 'commission_plan_deleted' | 'agent_assigned_to_plan',
  planId: number,
  planName: string,
  details?: Record<string, any>
): Promise<void> {
  await logAudit({
    tenantId,
    adminId: userId,
    adminName: userName,
    adminEmail: userEmail,
    action,
    targetType: 'commission_plan',
    targetId: planId,
    targetName: planName,
    details: details ? JSON.stringify(details) : null,
    ipAddress: getIpAddress(req),
    userAgent: getUserAgent(req),
  });
}

/**
 * Audit logging configuration summary
 */
export const AUDIT_CONFIG = {
  enabled: true,
  retention: {
    default: 90, // days
    critical: 365, // days for security events
  },
  actions: [
    'user_created',
    'user_deleted',
    'user_role_changed',
    'upload_deleted',
    'upload_viewed',
    'settings_changed',
    'data_exported',
    'tenant_settings_changed',
    'oauth_connected',
    'oauth_disconnected',
    'commission_viewed',
    'commission_plan_created',
    'commission_plan_updated',
    'commission_plan_deleted',
    'agent_assigned_to_plan',
    'login_success',
    'login_failed',
    'logout',
    'password_reset',
    'rate_limit_exceeded',
    'csrf_failure',
    'unauthorized_access',
    'permission_denied',
  ],
  targetTypes: ['user', 'upload', 'system', 'tenant', 'commission_plan', 'agent'],
};
