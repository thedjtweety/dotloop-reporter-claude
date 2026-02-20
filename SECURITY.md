# Security & Compliance Guide

This document outlines the security measures, compliance features, and best practices implemented in the Dotloop Reporter application.

---

## Table of Contents

1. [Security Overview](#security-overview)
2. [Role-Based Access Control (RBAC)](#role-based-access-control-rbac)
3. [Rate Limiting](#rate-limiting)
4. [Security Headers](#security-headers)
5. [CSRF Protection](#csrf-protection)
6. [Audit Logging](#audit-logging)
7. [Data Privacy](#data-privacy)
8. [Best Practices](#best-practices)
9. [Incident Response](#incident-response)
10. [Compliance](#compliance)

---

## Security Overview

The Dotloop Reporter implements defense-in-depth security with multiple layers of protection:

- **Authentication**: Manus OAuth integration with session management
- **Authorization**: Role-based access control with 4 user roles
- **Rate Limiting**: Tiered rate limits to prevent abuse
- **Security Headers**: Comprehensive HTTP security headers
- **CSRF Protection**: Token-based CSRF protection for state-changing operations
- **Audit Logging**: Complete audit trail of all security-critical actions
- **Data Encryption**: Sensitive data encrypted at rest and in transit
- **Input Validation**: All user inputs validated and sanitized

---

## Role-Based Access Control (RBAC)

### User Roles

The application implements 4 distinct user roles with hierarchical permissions:

| Role | Level | Description |
|------|-------|-------------|
| **Admin** | 4 | Full system access, user management, all data visibility |
| **Broker** | 3 | Team management, commission plans, team data visibility |
| **Agent** | 2 | Own data access, team data viewing, limited exports |
| **Viewer** | 1 | Read-only access to own data |

### Permission Matrix

| Permission | Admin | Broker | Agent | Viewer |
|------------|-------|--------|-------|--------|
| View own data | ✅ | ✅ | ✅ | ✅ |
| View team data | ✅ | ✅ | ✅ | ❌ |
| View all data | ✅ | ✅ | ❌ | ❌ |
| View own commission | ✅ | ✅ | ✅ | ✅ |
| View team commission | ✅ | ✅ | ❌ | ❌ |
| View all commission | ✅ | ✅ | ❌ | ❌ |
| Upload data | ✅ | ✅ | ✅ | ❌ |
| Delete own uploads | ✅ | ✅ | ✅ | ❌ |
| Delete team uploads | ✅ | ✅ | ❌ | ❌ |
| Delete all uploads | ✅ | ❌ | ❌ | ❌ |
| Manage users | ✅ | ❌ | ❌ | ❌ |
| Manage roles | ✅ | ❌ | ❌ | ❌ |
| Manage commission plans | ✅ | ✅ | ❌ | ❌ |
| Assign agents to plans | ✅ | ✅ | ❌ | ❌ |
| View audit logs | ✅ | ❌ | ❌ | ❌ |
| Export data | ✅ | ✅ | ✅ | ❌ |
| Manage settings | ✅ | ❌ | ❌ | ❌ |

### Implementation

RBAC is enforced at multiple levels:

1. **Middleware Level**: tRPC procedures use RBAC middleware to check permissions
2. **Database Level**: Row-level security filters data by user role and tenant
3. **UI Level**: Frontend components conditionally render based on user role

Example usage:

```typescript
// Require specific permission
import { requirePermission } from './middleware/rbac';

const myProcedure = protectedProcedure
  .use(requirePermission('manage_users'))
  .mutation(async ({ ctx, input }) => {
    // Only users with 'manage_users' permission can access
  });

// Require specific role or higher
import { requireBroker } from './middleware/rbac';

const brokerProcedure = protectedProcedure
  .use(requireBroker)
  .query(async ({ ctx }) => {
    // Only brokers and admins can access
  });
```

---

## Rate Limiting

Rate limiting prevents abuse and protects against DDoS attacks. Different limits apply to different endpoint types.

### Rate Limit Tiers

| Tier | Window | Max Requests | Use Case |
|------|--------|--------------|----------|
| **General API** | 15 min | 100 | Most API endpoints |
| **Strict API** | 15 min | 20 | Login, user management, role changes |
| **Upload** | 1 hour | 10 | File uploads |
| **OAuth** | 15 min | 5 | OAuth attempts |
| **Export** | 1 hour | 5 | Data exports (CSV, PDF) |
| **Admin** | 15 min | 50 | Admin-only endpoints |

### Implementation

Rate limiting is implemented using `express-rate-limit` with custom key generation:

- **Authenticated users**: Rate limited by user ID
- **Unauthenticated users**: Rate limited by IP address
- **Bypass**: Health checks and static assets are excluded

Example usage:

```typescript
import { strictApiLimiter, uploadLimiter } from './middleware/rate-limit';

// Apply strict rate limit to login endpoint
app.post('/api/auth/login', strictApiLimiter, loginHandler);

// Apply upload rate limit to file upload endpoint
app.post('/api/uploads', uploadLimiter, uploadHandler);
```

### Rate Limit Headers

Clients receive rate limit information in response headers:

- `RateLimit-Limit`: Maximum requests allowed in window
- `RateLimit-Remaining`: Requests remaining in current window
- `RateLimit-Reset`: Time when the rate limit resets (Unix timestamp)
- `Retry-After`: Seconds to wait before retrying (when limit exceeded)

---

## Security Headers

Comprehensive HTTP security headers protect against common web vulnerabilities.

### Implemented Headers

| Header | Value | Purpose |
|--------|-------|---------|
| **Content-Security-Policy** | Strict CSP | Prevents XSS attacks |
| **Strict-Transport-Security** | max-age=31536000 | Forces HTTPS |
| **X-Frame-Options** | DENY | Prevents clickjacking |
| **X-Content-Type-Options** | nosniff | Prevents MIME sniffing |
| **X-XSS-Protection** | 1; mode=block | Enables browser XSS filter |
| **Referrer-Policy** | strict-origin-when-cross-origin | Controls referrer information |
| **Permissions-Policy** | Restrictive | Limits browser features |

### Content Security Policy (CSP)

The application uses a strict CSP to prevent XSS attacks:

```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com data:;
img-src 'self' data: https: blob:;
connect-src 'self' https://api.manus.im https://auth.dotloop.com https://api-gateway.dotloop.com wss:;
frame-src 'none';
object-src 'none';
```

**Note**: `unsafe-inline` and `unsafe-eval` are required for Vite HMR in development. These should be removed in production builds.

### CORS Configuration

CORS is configured to allow requests from:

- `https://dotloopreport.com` (production domain)
- `http://localhost:5173` (Vite dev server)
- `http://localhost:3000` (Express dev server)
- `chrome-extension://*` (Chrome extension)

Credentials (cookies) are allowed for authenticated requests.

---

## CSRF Protection

Cross-Site Request Forgery (CSRF) protection prevents unauthorized state-changing operations.

### Implementation

The application uses token-based CSRF protection:

1. **Token Generation**: Server generates a unique CSRF token for each session
2. **Token Delivery**: Token is sent to client in response header or embedded in forms
3. **Token Validation**: Client must include token in `X-CSRF-Token` header for state-changing requests
4. **Token Expiry**: Tokens expire after 24 hours

### Protected Methods

CSRF protection is enforced on:

- `POST` requests
- `PUT` requests
- `DELETE` requests
- `PATCH` requests

`GET`, `HEAD`, and `OPTIONS` requests are exempt.

### Client Usage

```typescript
// Frontend: Include CSRF token in request headers
const response = await fetch('/api/users', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken, // Obtained from server
  },
  body: JSON.stringify(data),
});
```

---

## Audit Logging

Comprehensive audit logging tracks all security-critical actions for compliance and forensic analysis.

### What Gets Logged

| Category | Actions |
|----------|---------|
| **Authentication** | Login success/failure, logout, password reset |
| **User Management** | User creation, deletion, role changes |
| **Data Access** | Viewing sensitive commission data, data exports |
| **Data Modification** | Uploads, deletions, updates |
| **Admin Actions** | Settings changes, user management |
| **Security Events** | Rate limit violations, CSRF failures, unauthorized access |
| **Commission Plans** | Creation, updates, deletions, agent assignments |

### Log Structure

Each audit log entry contains:

- **Timestamp**: When the action occurred
- **Tenant ID**: Which tenant the action belongs to
- **Admin ID**: User who performed the action
- **Admin Name**: Name of the user
- **Admin Email**: Email of the user (if available)
- **Action**: Type of action performed
- **Target Type**: Type of resource affected (user, upload, system, etc.)
- **Target ID**: ID of the affected resource
- **Target Name**: Name/description of the affected resource
- **Details**: Additional context (JSON)
- **IP Address**: IP address of the request
- **User Agent**: Browser/client information

### Log Retention

- **Default**: 90 days
- **Critical Security Events**: 365 days
- **Compliance**: Logs can be exported for regulatory requirements

### Viewing Audit Logs

Audit logs are accessible to admins via:

1. **Admin Dashboard**: View recent activity
2. **Audit Log Viewer**: Search and filter logs
3. **Export**: Download logs as CSV for compliance

### Example Log Entry

```json
{
  "timestamp": "2026-02-20T15:30:00Z",
  "tenantId": 1,
  "adminId": 42,
  "adminName": "John Doe",
  "adminEmail": "john@example.com",
  "action": "user_role_changed",
  "targetType": "user",
  "targetId": 123,
  "targetName": "Jane Smith",
  "details": "{\"oldRole\":\"agent\",\"newRole\":\"broker\"}",
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0..."
}
```

---

## Data Privacy

The application implements comprehensive data privacy controls to comply with legal requirements.

### Privacy Settings

Users can control the visibility of their data:

| Setting | Options | Description |
|---------|---------|-------------|
| **Commission Visibility** | Public, Team, Admin Only, Private | Who can see commission data |
| **Allow Others View My Commission** | Yes/No | Explicit opt-in for commission sharing |
| **Allow Others View My Transactions** | Yes/No | Explicit opt-in for transaction sharing |
| **Show in Leaderboard** | Yes/No | Opt-in/out of public leaderboards |

### Default Privacy Settings

- **Commission Visibility**: Admin Only
- **Allow Others View My Commission**: No
- **Allow Others View My Transactions**: Yes
- **Show in Leaderboard**: Yes

### Data Segregation

Data is segregated at multiple levels:

1. **Tenant Level**: Each brokerage's data is isolated
2. **User Level**: Users can only access data they have permission to view
3. **Team Level**: Team members can view team data (if permissions allow)

### Commission Data Protection

Commission data is particularly sensitive and has additional protections:

- **Role-based access**: Only admins and brokers can view all commission data by default
- **Privacy settings**: Agents can restrict who sees their commission data
- **Audit logging**: All commission data access is logged
- **Masking**: Commission data is masked in UI for unauthorized users

---

## Best Practices

### For Developers

1. **Always use RBAC middleware**: Protect all sensitive endpoints with appropriate permissions
2. **Validate all inputs**: Never trust user input, always validate and sanitize
3. **Log security events**: Use audit logging for all security-critical actions
4. **Follow principle of least privilege**: Grant minimum necessary permissions
5. **Keep dependencies updated**: Regularly update packages to patch vulnerabilities
6. **Use environment variables**: Never hardcode secrets or API keys
7. **Enable HTTPS**: Always use HTTPS in production
8. **Implement proper error handling**: Don't leak sensitive information in error messages

### For Administrators

1. **Review audit logs regularly**: Monitor for suspicious activity
2. **Enforce strong passwords**: Require complex passwords for all users
3. **Limit admin access**: Only grant admin role to trusted users
4. **Review user roles**: Periodically audit user roles and permissions
5. **Monitor rate limits**: Watch for rate limit violations
6. **Keep software updated**: Apply security patches promptly
7. **Backup data regularly**: Maintain regular backups for disaster recovery
8. **Train users**: Educate users on security best practices

### For Users

1. **Use strong passwords**: Choose complex, unique passwords
2. **Enable 2FA**: Use two-factor authentication when available
3. **Review privacy settings**: Configure privacy settings appropriately
4. **Report suspicious activity**: Report any security concerns to administrators
5. **Keep browser updated**: Use the latest browser version
6. **Don't share credentials**: Never share your login credentials
7. **Log out when done**: Always log out on shared computers
8. **Verify URLs**: Ensure you're on the correct domain before logging in

---

## Incident Response

### Security Incident Response Plan

1. **Detection**: Monitor audit logs and security alerts
2. **Containment**: Isolate affected systems/users
3. **Investigation**: Analyze logs to determine scope and impact
4. **Remediation**: Fix vulnerabilities and restore normal operations
5. **Communication**: Notify affected users and stakeholders
6. **Documentation**: Document incident and lessons learned
7. **Prevention**: Implement measures to prevent recurrence

### Reporting Security Issues

If you discover a security vulnerability, please report it to:

- **Email**: security@dotloopreport.com
- **Response Time**: Within 24 hours
- **Disclosure**: Responsible disclosure policy

**Do not** publicly disclose security vulnerabilities before they are fixed.

---

## Compliance

### GDPR Compliance

The application implements GDPR-compliant features:

- **Right to Access**: Users can export their data
- **Right to Erasure**: Users can request data deletion
- **Right to Rectification**: Users can update their data
- **Data Portability**: Data can be exported in machine-readable format
- **Consent Management**: Explicit consent for data processing
- **Audit Trail**: Complete audit logs of data access and modifications

### SOC 2 Compliance

The application is designed with SOC 2 compliance in mind:

- **Security**: Comprehensive security controls
- **Availability**: High availability and disaster recovery
- **Processing Integrity**: Data validation and integrity checks
- **Confidentiality**: Encryption and access controls
- **Privacy**: Privacy settings and data protection

### Data Retention

- **User Data**: Retained while account is active
- **Audit Logs**: 90 days (default), 365 days (critical events)
- **Deleted Data**: Soft-deleted for 30 days, then permanently deleted
- **Backups**: Retained for 90 days

---

## Security Checklist

Use this checklist to verify security measures are in place:

### Authentication & Authorization
- [x] OAuth integration implemented
- [x] Session management configured
- [x] Role-based access control (RBAC) implemented
- [x] Permission checks on all sensitive endpoints
- [x] Password requirements enforced
- [ ] Two-factor authentication (2FA) available

### Network Security
- [x] HTTPS enforced in production
- [x] Security headers configured
- [x] CORS properly configured
- [x] Rate limiting implemented
- [x] DDoS protection enabled

### Data Protection
- [x] Data encrypted at rest
- [x] Data encrypted in transit (HTTPS)
- [x] Sensitive data masked in UI
- [x] Privacy settings implemented
- [x] Data segregation by tenant
- [x] Input validation and sanitization

### Monitoring & Logging
- [x] Audit logging implemented
- [x] Security events logged
- [x] Log retention policy defined
- [x] Audit log viewer for admins
- [ ] Real-time security monitoring
- [ ] Automated alerting for security events

### Compliance
- [x] GDPR features implemented
- [x] Data export functionality
- [x] Data deletion functionality
- [x] Privacy policy documented
- [ ] SOC 2 audit completed
- [ ] Penetration testing performed

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-02-20 | Initial security implementation |

---

## Contact

For security questions or concerns, contact:

- **Security Team**: security@dotloopreport.com
- **Support**: support@dotloopreport.com
- **Documentation**: https://docs.dotloopreport.com

---

**Last Updated**: February 20, 2026
