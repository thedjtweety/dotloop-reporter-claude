/**
 * Security Features Test Suite
 * 
 * Tests for RBAC, rate limiting, and audit logging
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { hasPermission, canViewUserData, canViewUserCommission, canManageRole } from './lib/permissions';
import type { UserRole } from './lib/permissions';

describe('Role-Based Access Control (RBAC)', () => {
  describe('Permission Checks', () => {
    it('should grant admin all permissions', () => {
      expect(hasPermission('admin', 'view_all_data')).toBe(true);
      expect(hasPermission('admin', 'manage_users')).toBe(true);
      expect(hasPermission('admin', 'manage_roles')).toBe(true);
      expect(hasPermission('admin', 'view_audit_logs')).toBe(true);
    });

    it('should grant broker team management permissions', () => {
      expect(hasPermission('broker', 'view_team_data')).toBe(true);
      expect(hasPermission('broker', 'view_all_commission')).toBe(true);
      expect(hasPermission('broker', 'manage_commission_plans')).toBe(true);
      expect(hasPermission('broker', 'assign_agents_to_plans')).toBe(true);
    });

    it('should restrict broker from admin-only actions', () => {
      expect(hasPermission('broker', 'manage_users')).toBe(false);
      expect(hasPermission('broker', 'manage_roles')).toBe(false);
      expect(hasPermission('broker', 'view_audit_logs')).toBe(false);
    });

    it('should grant agent limited permissions', () => {
      expect(hasPermission('agent', 'view_own_data')).toBe(true);
      expect(hasPermission('agent', 'view_team_data')).toBe(true);
      expect(hasPermission('agent', 'upload_data')).toBe(true);
      expect(hasPermission('agent', 'export_data')).toBe(true);
    });

    it('should restrict agent from sensitive actions', () => {
      expect(hasPermission('agent', 'view_all_commission')).toBe(false);
      expect(hasPermission('agent', 'manage_commission_plans')).toBe(false);
      expect(hasPermission('agent', 'delete_team_uploads')).toBe(false);
    });

    it('should grant viewer minimal permissions', () => {
      expect(hasPermission('viewer', 'view_own_data')).toBe(true);
      expect(hasPermission('viewer', 'view_own_commission')).toBe(true);
    });

    it('should restrict viewer from most actions', () => {
      expect(hasPermission('viewer', 'view_team_data')).toBe(false);
      expect(hasPermission('viewer', 'upload_data')).toBe(false);
      expect(hasPermission('viewer', 'export_data')).toBe(false);
    });
  });

  describe('Data Visibility', () => {
    it('should allow users to view own data', () => {
      expect(canViewUserData('agent', 123, 123)).toBe(true);
      expect(canViewUserData('viewer', 456, 456)).toBe(true);
    });

    it('should allow admin to view all data', () => {
      expect(canViewUserData('admin', 123, 456)).toBe(true);
      expect(canViewUserData('admin', 789, 456)).toBe(true);
    });

    it('should allow broker to view all data', () => {
      expect(canViewUserData('broker', 123, 456)).toBe(true);
      expect(canViewUserData('broker', 789, 456)).toBe(true);
    });

    it('should allow agent to view team data', () => {
      expect(canViewUserData('agent', 123, 456, 1, 1)).toBe(true);
    });

    it('should restrict agent from viewing other teams data', () => {
      expect(canViewUserData('agent', 123, 456, 1, 2)).toBe(false);
    });

    it('should restrict viewer from viewing others data', () => {
      expect(canViewUserData('viewer', 123, 456)).toBe(false);
      expect(canViewUserData('viewer', 123, 456, 1, 1)).toBe(false);
    });
  });

  describe('Commission Visibility', () => {
    it('should respect privacy settings - private', () => {
      expect(canViewUserCommission('admin', 123, 456, undefined, undefined, 'private')).toBe(false);
      expect(canViewUserCommission('broker', 123, 456, undefined, undefined, 'private')).toBe(false);
    });

    it('should respect privacy settings - admin_only', () => {
      expect(canViewUserCommission('admin', 123, 456, undefined, undefined, 'admin_only')).toBe(true);
      expect(canViewUserCommission('broker', 123, 456, undefined, undefined, 'admin_only')).toBe(false);
    });

    it('should respect privacy settings - team', () => {
      expect(canViewUserCommission('broker', 123, 456, 1, 1, 'team')).toBe(true);
      expect(canViewUserCommission('broker', 123, 456, 1, 2, 'team')).toBe(false);
    });

    it('should allow viewing own commission', () => {
      expect(canViewUserCommission('agent', 123, 123, undefined, undefined, 'private')).toBe(true);
      expect(canViewUserCommission('viewer', 456, 456, undefined, undefined, 'private')).toBe(true);
    });

    it('should allow admin to view all commission (except private)', () => {
      expect(canViewUserCommission('admin', 123, 456, undefined, undefined, 'public')).toBe(true);
      expect(canViewUserCommission('admin', 123, 456, undefined, undefined, 'admin_only')).toBe(true);
    });
  });

  describe('Role Management', () => {
    it('should allow admin to manage all roles', () => {
      expect(canManageRole('admin', 'broker')).toBe(true);
      expect(canManageRole('admin', 'agent')).toBe(true);
      expect(canManageRole('admin', 'viewer')).toBe(true);
    });

    it('should allow broker to manage agents and viewers', () => {
      expect(canManageRole('broker', 'agent')).toBe(true);
      expect(canManageRole('broker', 'viewer')).toBe(true);
    });

    it('should restrict broker from managing admins and brokers', () => {
      expect(canManageRole('broker', 'admin')).toBe(false);
      expect(canManageRole('broker', 'broker')).toBe(false);
    });

    it('should allow agent to manage lower roles based on hierarchy', () => {
      expect(canManageRole('agent', 'viewer')).toBe(true); // Agent (2) > Viewer (1)
      expect(canManageRole('agent', 'agent')).toBe(false); // Agent (2) = Agent (2)
      expect(canManageRole('agent', 'broker')).toBe(false); // Agent (2) < Broker (3)
    });
  });
});

describe('Rate Limiting Configuration', () => {
  it('should have correct general API limits', async () => {
    const { RATE_LIMIT_CONFIG } = await import('./middleware/rate-limit');
    expect(RATE_LIMIT_CONFIG.general.windowMs).toBe(15 * 60 * 1000);
    expect(RATE_LIMIT_CONFIG.general.max).toBe(100);
  });

  it('should have stricter limits for sensitive operations', async () => {
    const { RATE_LIMIT_CONFIG } = await import('./middleware/rate-limit');
    expect(RATE_LIMIT_CONFIG.strict.max).toBe(20);
    expect(RATE_LIMIT_CONFIG.strict.max).toBeLessThan(RATE_LIMIT_CONFIG.general.max);
  });

  it('should have appropriate upload limits', async () => {
    const { RATE_LIMIT_CONFIG } = await import('./middleware/rate-limit');
    expect(RATE_LIMIT_CONFIG.upload.windowMs).toBe(60 * 60 * 1000);
    expect(RATE_LIMIT_CONFIG.upload.max).toBe(10);
  });

  it('should have strict OAuth limits', async () => {
    const { RATE_LIMIT_CONFIG } = await import('./middleware/rate-limit');
    expect(RATE_LIMIT_CONFIG.oauth.max).toBe(5);
  });
});

describe('Security Headers Configuration', () => {
  it('should have CSP configured', async () => {
    const { SECURITY_HEADERS_CONFIG } = await import('./middleware/security-headers');
    expect(SECURITY_HEADERS_CONFIG.csp.enabled).toBe(true);
    expect(SECURITY_HEADERS_CONFIG.csp.directives).toContain("default-src 'self'");
  });

  it('should have HSTS configured with long max-age', async () => {
    const { SECURITY_HEADERS_CONFIG } = await import('./middleware/security-headers');
    expect(SECURITY_HEADERS_CONFIG.hsts.enabled).toBe(true);
    expect(SECURITY_HEADERS_CONFIG.hsts.maxAge).toBe(31536000);
  });

  it('should have frameguard enabled', async () => {
    const { SECURITY_HEADERS_CONFIG } = await import('./middleware/security-headers');
    expect(SECURITY_HEADERS_CONFIG.frameguard.enabled).toBe(true);
    expect(SECURITY_HEADERS_CONFIG.frameguard.action).toBe('deny');
  });

  it('should have permissions policy configured', async () => {
    const { SECURITY_HEADERS_CONFIG } = await import('./middleware/security-headers');
    expect(SECURITY_HEADERS_CONFIG.permissionsPolicy.enabled).toBe(true);
    expect(SECURITY_HEADERS_CONFIG.permissionsPolicy.restrictions).toContain('geolocation');
    expect(SECURITY_HEADERS_CONFIG.permissionsPolicy.restrictions).toContain('camera');
  });
});

describe('Audit Logging Configuration', () => {
  it('should have audit logging enabled', async () => {
    const { AUDIT_CONFIG } = await import('./lib/audit-logger');
    expect(AUDIT_CONFIG.enabled).toBe(true);
  });

  it('should have appropriate retention policies', async () => {
    const { AUDIT_CONFIG } = await import('./lib/audit-logger');
    expect(AUDIT_CONFIG.retention.default).toBe(90);
    expect(AUDIT_CONFIG.retention.critical).toBe(365);
  });

  it('should log all critical actions', async () => {
    const { AUDIT_CONFIG } = await import('./lib/audit-logger');
    expect(AUDIT_CONFIG.actions).toContain('login_success');
    expect(AUDIT_CONFIG.actions).toContain('login_failed');
    expect(AUDIT_CONFIG.actions).toContain('user_role_changed');
    expect(AUDIT_CONFIG.actions).toContain('commission_viewed');
    expect(AUDIT_CONFIG.actions).toContain('rate_limit_exceeded');
    expect(AUDIT_CONFIG.actions).toContain('csrf_failure');
  });

  it('should support all target types', async () => {
    const { AUDIT_CONFIG } = await import('./lib/audit-logger');
    expect(AUDIT_CONFIG.targetTypes).toContain('user');
    expect(AUDIT_CONFIG.targetTypes).toContain('upload');
    expect(AUDIT_CONFIG.targetTypes).toContain('system');
    expect(AUDIT_CONFIG.targetTypes).toContain('commission_plan');
  });
});
