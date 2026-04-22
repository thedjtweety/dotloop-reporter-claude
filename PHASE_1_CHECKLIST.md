# Phase 1 Implementation Checklist: Foundation & OAuth Integration

## Overview
Phase 1 establishes the foundational architecture for multi-tenant SaaS with secure Dotloop OAuth integration. This is critical infrastructure that all subsequent features depend on.

**Target Duration**: 3 weeks (10-15 working days)  
**Status**: Starting

---

## 1. Database Schema Updates (Days 1-2)

### 1.1 Create Tenants Table
- [ ] Create `tenants` table with: id, name, created_at, owner_id, primary_color, accent_color, tagline
- [ ] Add indexes on id, owner_id
- [ ] Add foreign key constraint to users table

### 1.2 Add Multi-Tenancy to Existing Tables
- [ ] Add `tenant_id UUID NOT NULL` to: users, transactions, agents, teams, goals, commission_plans
- [ ] Add composite indexes on (tenant_id, id) for all tables
- [ ] Add foreign key constraints: FOREIGN KEY (tenant_id) REFERENCES tenants(id)
- [ ] Backfill existing data with default tenant_id

### 1.3 Create OAuth Tables
- [ ] Create `oauth_tokens` table:
  - id UUID PRIMARY KEY
  - tenant_id UUID NOT NULL (FK)
  - user_id UUID NOT NULL (FK)
  - encrypted_access_token TEXT NOT NULL
  - encrypted_refresh_token TEXT NOT NULL
  - iv VARCHAR(32) NOT NULL (initialization vector)
  - refresh_iv VARCHAR(32) NOT NULL
  - token_expires_at TIMESTAMP
  - scope VARCHAR(255)
  - dotloop_account_id VARCHAR(100)
  - dotloop_account_email VARCHAR(255)
  - created_at TIMESTAMP DEFAULT NOW()
  - Indexes: (tenant_id, user_id), (dotloop_account_id)

- [ ] Create `token_audit_logs` table:
  - id UUID PRIMARY KEY
  - tenant_id UUID NOT NULL (FK)
  - user_id UUID NOT NULL (FK)
  - action VARCHAR(100) -- 'dotloop_connected', 'token_refreshed', 'refresh_failed', 'force_reconnect', 'token_revoked'
  - details JSONB
  - ip_address VARCHAR(45)
  - created_at TIMESTAMP DEFAULT NOW()
  - Indexes: (tenant_id, created_at), (user_id)

### 1.4 Create Audit Logging Tables
- [ ] Create `audit_logs` table:
  - id UUID PRIMARY KEY
  - tenant_id UUID NOT NULL (FK)
  - user_id UUID NOT NULL (FK)
  - action VARCHAR(100) -- 'create', 'update', 'delete', 'export', 'import'
  - resource_type VARCHAR(100) -- 'transaction', 'commission_plan', 'user', etc.
  - resource_id VARCHAR(100)
  - changes JSONB -- { old: {...}, new: {...} }
  - ip_address VARCHAR(45)
  - user_agent TEXT
  - timestamp TIMESTAMP DEFAULT NOW()
  - Indexes: (tenant_id, timestamp), (user_id, timestamp), (resource_type)

- [ ] Create `data_change_log` table:
  - id UUID PRIMARY KEY
  - tenant_id UUID NOT NULL (FK)
  - transaction_id UUID NOT NULL (FK)
  - field_name VARCHAR(100)
  - old_value TEXT
  - new_value TEXT
  - changed_by UUID NOT NULL (FK to users)
  - change_source VARCHAR(50) -- 'manual', 'import', 'sync', 'bulk'
  - timestamp TIMESTAMP DEFAULT NOW()
  - Indexes: (tenant_id, transaction_id), (changed_by)

### 1.5 Update Users Table
- [ ] Add `role` enum column (admin, broker, member, agent) with default 'member'
- [ ] Add `tenant_id UUID NOT NULL` (FK)
- [ ] Add `profile_image_url TEXT`
- [ ] Add composite unique constraint: (tenant_id, email)
- [ ] Add index on (tenant_id, role)

### 1.6 Run Migrations
- [ ] Create Drizzle migration files
- [ ] Test migrations locally
- [ ] Run `pnpm db:push` to apply changes
- [ ] Verify all tables and indexes created successfully

---

## 2. Dotloop OAuth Integration (Days 3-6)

### 2.1 Token Encryption Library
- [ ] Create `server/lib/token-encryption.ts`:
  - `encryptToken(plaintext: string): { encrypted: string; iv: string }`
  - `decryptToken(encrypted: string, iv: string): string`
  - Use AES-256-CBC algorithm
  - Generate random IV per encryption
  - Use SHA256 hash of TOKEN_ENCRYPTION_KEY as encryption key
  - Add comprehensive error handling

- [ ] Create tests for encryption/decryption
- [ ] Verify encryption is deterministic (same key + IV = same output)
- [ ] Test with various token sizes

### 2.2 Token Refresh Logic
- [ ] Create `server/lib/dotloop-token-refresh.ts`:
  - `getValidAccessToken(tenantId, userId, accountId?): Promise<string | null>`
  - Check token expiration with 5-minute buffer
  - If expired: use refresh token to get new tokens
  - Decrypt refresh token, exchange for new access token
  - Re-encrypt and store new tokens
  - Audit log all refresh attempts
  - Handle refresh failures gracefully

- [ ] Create tests for token refresh
- [ ] Test with expired tokens
- [ ] Test with invalid refresh tokens
- [ ] Verify audit logs are created

### 2.3 OAuth Routes
- [ ] Create `server/routes/dotloop-oauth.ts`:

  **GET /api/dotloop-oauth/auth-url**
  - Generate random state token (16 bytes hex)
  - Store state in httpOnly cookie (10-minute TTL)
  - Build OAuth URL with: response_type=code, client_id, redirect_uri, state
  - Return { url: string }
  - Error handling if CLIENT_ID/SECRET not configured

  **GET /api/dotloop-oauth/callback**
  - Validate authorization code exists
  - Validate state token matches cookie
  - Clear state cookie
  - Exchange code for tokens (POST to DOTLOOP_TOKEN_URL)
  - Fetch Dotloop account info (email, name, account_id)
  - Create or link user/tenant atomically:
    - If authenticated: link to existing tenant
    - If not authenticated: create new tenant and user
  - Encrypt tokens (AES-256-CBC)
  - Store encrypted tokens with IV, expiration, account info
  - Create token audit log entry
  - Clear dotloop_return_to cookie
  - Redirect to safe return URL (with open-redirect protection)
  - Error handling for all failure points

  **GET /api/dotloop-oauth/accounts**
  - Require authentication
  - Return list of connected Dotloop accounts for current user
  - Include: id, dotloopAccountId, dotloopAccountEmail, tokenExpiresAt, createdAt

  **GET /api/dotloop-oauth/status**
  - Require authentication
  - Return connection status: { connected, dotloopAccountEmail, dotloopAccountId, tokenExpiresAt }

  **POST /api/dotloop-oauth/force-reconnect**
  - Require authentication
  - Revoke all tokens via Dotloop revoke endpoint
  - Delete all oauth_tokens records for user
  - Create audit log entry
  - Return success message

- [ ] Add comprehensive error handling
- [ ] Add logging for all OAuth operations
- [ ] Test all endpoints thoroughly

### 2.4 Environment Variables
- [ ] Add to `.env`:
  - DOTLOOP_CLIENT_ID
  - DOTLOOP_CLIENT_SECRET
  - TOKEN_ENCRYPTION_KEY (strong random string, min 32 chars)
  - DOTLOOP_REDIRECT_URI (e.g., https://yourdomain.com/api/dotloop-oauth/callback)

- [ ] Document all required environment variables
- [ ] Add validation to ensure all env vars are set on startup

### 2.5 OAuth Tests
- [ ] Test auth-url generation
- [ ] Test callback with valid code
- [ ] Test callback with invalid code
- [ ] Test state token validation
- [ ] Test CSRF protection (state mismatch)
- [ ] Test user creation on first OAuth
- [ ] Test user linking on subsequent OAuth
- [ ] Test token encryption/decryption
- [ ] Test token refresh logic
- [ ] Test force-reconnect
- [ ] Test account listing

---

## 3. Multi-Tenancy Middleware (Days 7-8)

### 3.1 Tenant Middleware
- [ ] Create `server/middlewares/requireTenant.ts`:
  - Extract tenant_id from session
  - Validate tenant_id exists and is valid
  - Attach tenant_id to req.tenantId
  - Return 401 if not authenticated
  - Return 403 if tenant_id invalid

- [ ] Create `server/middlewares/requireAuth.ts`:
  - Check if user is authenticated
  - Return 401 if not
  - Attach user to req.user

### 3.2 Query Scoping
- [ ] Update all database queries to include tenant_id filter:
  - Transactions: `where(eq(tenantId, req.tenantId))`
  - Agents: `where(eq(tenantId, req.tenantId))`
  - Teams: `where(eq(tenantId, req.tenantId))`
  - Goals: `where(eq(tenantId, req.tenantId))`
  - Commission Plans: `where(eq(tenantId, req.tenantId))`
  - All other tables

- [ ] Create helper function for common query patterns
- [ ] Add tests to verify tenant isolation (user A cannot see user B's data)

### 3.3 Session Management
- [ ] Update session to include tenant_id
- [ ] Validate tenant_id on every request
- [ ] Prevent cross-tenant access

### 3.4 Tenant Isolation Tests
- [ ] Create test users in different tenants
- [ ] Verify user A cannot query user B's transactions
- [ ] Verify user A cannot query user B's agents
- [ ] Verify user A cannot query user B's commission plans
- [ ] Verify user A cannot update user B's data

---

## 4. Role-Based Access Control (Days 9-10)

### 4.1 Role Middleware
- [ ] Create `server/middlewares/requireAdmin.ts`:
  - Check user.role === 'admin'
  - Return 403 if not admin

- [ ] Create `server/middlewares/requireBroker.ts`:
  - Check user.role in ['admin', 'broker']
  - Return 403 if not admin/broker

- [ ] Create `server/middlewares/requireNonAgent.ts`:
  - Check user.role in ['admin', 'broker', 'member']
  - Return 403 if agent

### 4.2 Apply RBAC to Routes
- [ ] Admin-only routes:
  - POST /api/admin/* (user management)
  - GET /api/audit-logs
  - POST /api/alerts/rules
  - POST /api/webhooks
  - POST /api/reports/schedule

- [ ] Broker-only routes:
  - POST /api/commission/plans
  - PUT /api/commission/plans/:id
  - DELETE /api/commission/plans/:id
  - POST /api/teams
  - PUT /api/teams/:id

- [ ] Member+ routes:
  - GET /api/agents
  - GET /api/transactions
  - GET /api/dashboard

- [ ] Agent self-service routes:
  - GET /api/agent-self/stats
  - GET /api/agent-self/transactions

### 4.3 RBAC Tests
- [ ] Test admin can access all routes
- [ ] Test broker cannot access admin routes
- [ ] Test member cannot access broker routes
- [ ] Test agent can only access self-service routes

---

## 5. Audit Logging Infrastructure (Days 11-12)

### 5.1 Audit Logger Utility
- [ ] Create `server/lib/audit.ts`:
  - `logAudit(req, action, resourceType, resourceId, changes)`
  - `logDataChange(req, transactionId, fieldName, oldValue, newValue, source)`
  - Automatically capture: user_id, tenant_id, ip_address, user_agent, timestamp
  - Insert into audit_logs and data_change_log tables

### 5.2 Audit Logging Points
- [ ] Log all transaction updates (create, update, delete)
- [ ] Log all commission plan changes
- [ ] Log all user management actions
- [ ] Log all data imports
- [ ] Log all bulk operations
- [ ] Log all OAuth events (already done in OAuth routes)

### 5.3 Audit Log Viewer API
- [ ] Create `server/routes/audit-logs.ts`:
  - GET /api/audit-logs (paginated, filterable)
  - GET /api/data-changes (paginated, filterable)
  - Filters: date range, resource type, action, user, search term
  - Require admin role

### 5.4 Audit Logging Tests
- [ ] Test audit log creation on transaction update
- [ ] Test audit log creation on commission plan change
- [ ] Test audit log filtering
- [ ] Test data change log creation
- [ ] Verify immutability (cannot delete audit logs)

---

## 6. Frontend Updates (Days 13-14)

### 6.1 OAuth Login Flow
- [ ] Update login page:
  - Add "Connect with Dotloop" button
  - Fetch OAuth URL from /api/dotloop-oauth/auth-url
  - Redirect to OAuth URL
  - Handle redirect back with ?dotloop=connected query param

- [ ] Create OAuth callback handler:
  - Detect redirect from OAuth
  - Show success message
  - Redirect to dashboard

### 6.2 OAuth Status Display
- [ ] Add OAuth status indicator in settings
- [ ] Show connected Dotloop account email
- [ ] Show token expiration date
- [ ] Add "Disconnect" button
- [ ] Add "Reconnect" button

### 6.3 Multi-Account Support UI
- [ ] Add account selector dropdown
- [ ] Allow switching between connected accounts
- [ ] Show all connected accounts in settings
- [ ] Add "Connect Another Account" button

### 6.4 Tenant Context
- [ ] Create TenantContext to store current tenant
- [ ] Update all API calls to use tenant_id
- [ ] Update navigation to show tenant name
- [ ] Add tenant selector if user has access to multiple tenants

### 6.5 Role-Based UI
- [ ] Hide admin-only features from non-admins
- [ ] Hide broker-only features from members
- [ ] Hide all features from agents except self-service

### 6.6 Frontend Tests
- [ ] Test OAuth login flow
- [ ] Test account switching
- [ ] Test role-based UI visibility
- [ ] Test tenant isolation in UI

---

## 7. End-to-End Testing (Day 15)

### 7.1 OAuth Flow Testing
- [ ] Test complete OAuth flow from login to dashboard
- [ ] Test token refresh on API calls
- [ ] Test token expiration handling
- [ ] Test force-reconnect flow
- [ ] Test multi-account switching

### 7.2 Multi-Tenancy Testing
- [ ] Create 2 test users in different tenants
- [ ] Verify user A cannot see user B's data
- [ ] Verify user A cannot modify user B's data
- [ ] Test all API endpoints for tenant isolation

### 7.3 RBAC Testing
- [ ] Test admin access to all routes
- [ ] Test broker access restrictions
- [ ] Test member access restrictions
- [ ] Test agent self-service access

### 7.4 Audit Logging Testing
- [ ] Verify audit logs created for all actions
- [ ] Verify data change logs created for transactions
- [ ] Test audit log viewer
- [ ] Verify immutability of audit logs

### 7.5 Security Testing
- [ ] Test CSRF protection (state token validation)
- [ ] Test open-redirect protection
- [ ] Test token encryption (verify tokens are not stored plaintext)
- [ ] Test cross-tenant access prevention
- [ ] Test unauthorized access handling

### 7.6 Performance Testing
- [ ] Verify query performance with tenant_id filters
- [ ] Check index usage
- [ ] Test with large datasets (10k+ transactions)
- [ ] Verify no N+1 queries

---

## 8. Documentation & Deployment (Day 15)

### 8.1 Code Documentation
- [ ] Document OAuth flow in code comments
- [ ] Document token encryption/decryption
- [ ] Document multi-tenancy scoping
- [ ] Document RBAC middleware
- [ ] Document audit logging

### 8.2 API Documentation
- [ ] Update OpenAPI spec with new endpoints
- [ ] Document OAuth endpoints
- [ ] Document audit log endpoints
- [ ] Document error codes

### 8.3 Deployment Checklist
- [ ] Verify all environment variables set
- [ ] Run database migrations
- [ ] Test OAuth in production
- [ ] Monitor for errors
- [ ] Verify token encryption working
- [ ] Verify audit logs being created

### 8.4 Rollback Plan
- [ ] Document rollback procedure
- [ ] Test rollback process
- [ ] Keep backup of previous version

---

## Success Criteria

✅ **OAuth Integration**
- Users can login with Dotloop OAuth
- Tokens are encrypted and stored securely
- Token refresh works automatically
- Multi-account support functional
- Force-reconnect works

✅ **Multi-Tenancy**
- Each user has a tenant_id
- All queries filtered by tenant_id
- User A cannot see user B's data
- Tenant isolation verified in all tests

✅ **RBAC**
- Admin role has full access
- Broker role cannot access admin routes
- Member role cannot access broker routes
- Agent role can only access self-service

✅ **Audit Logging**
- All actions logged to audit_logs
- Data changes logged to data_change_log
- Audit logs immutable
- Audit log viewer functional

✅ **Security**
- Tokens encrypted (AES-256-CBC)
- CSRF protection (state token)
- Open-redirect protection
- Cross-tenant access prevented
- All tests passing

---

## Notes

- This is foundational work - take time to get it right
- Every subsequent feature depends on this
- Thorough testing is critical
- Security is paramount
- Document everything clearly

