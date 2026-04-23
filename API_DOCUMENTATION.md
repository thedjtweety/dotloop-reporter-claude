# Dotloop Reporting Tool - API Documentation

## Overview

The Dotloop Reporting Tool provides a comprehensive REST/tRPC API for managing real estate transaction data, commission calculations, team management, and reporting. All endpoints are secured with OAuth 2.0 and enforce multi-tenant isolation.

## Authentication

All API requests require authentication via JWT token obtained through Manus OAuth 2.0. Include the token in the Authorization header:

```
Authorization: Bearer <token>
```

## Base URL

```
https://dotloopreport.com/api/trpc
```

## API Endpoints

### Dashboard

#### Get Dashboard Metrics
```
GET /dashboard.getMetrics
```

Returns aggregated metrics for the current tenant including transaction counts, revenue, commissions, and performance indicators.

**Response:**
```json
{
  "totalTransactions": 150,
  "totalRevenue": 45000000,
  "totalCommissions": 2250000,
  "averageCommissionRate": 0.05,
  "closingRate": 0.75,
  "averageDaysToClose": 45
}
```

### Commission Management

#### List Commission Plans
```
GET /commission.getPlans
```

Returns all active commission plans for the tenant.

**Response:**
```json
[
  {
    "id": "plan-123",
    "name": "Standard Commission Plan",
    "splitPercentage": 50,
    "capAmount": 100000,
    "tiers": [
      { "min": 0, "max": 100000, "rate": 0.04 },
      { "min": 100000, "max": 500000, "rate": 0.05 }
    ]
  }
]
```

#### Create Commission Plan
```
POST /commission.createPlan
```

**Request Body:**
```json
{
  "name": "Premium Plan",
  "splitPercentage": 60,
  "capAmount": 150000,
  "tiers": [...]
}
```

#### Calculate Commission
```
POST /commission.calculate
```

Calculates commission for transactions based on assigned plans.

**Request Body:**
```json
{
  "transactionIds": ["tx-1", "tx-2"],
  "planId": "plan-123"
}
```

### Team Management

#### List Team Members
```
GET /teamManagement.listMembers
```

Returns all team members for the current tenant.

**Response:**
```json
[
  {
    "id": "member-1",
    "email": "agent@example.com",
    "name": "John Doe",
    "role": "agent",
    "joinedAt": "2024-01-15T00:00:00Z"
  }
]
```

#### Add Team Member
```
POST /teamManagement.addMember
```

**Request Body:**
```json
{
  "email": "newagent@example.com",
  "role": "agent"
}
```

#### Update Member Role
```
POST /teamManagement.updateMember
```

**Request Body:**
```json
{
  "memberId": "member-1",
  "role": "broker"
}
```

#### Remove Team Member
```
POST /teamManagement.removeMember
```

**Request Body:**
```json
{
  "memberId": "member-1"
}
```

### Reporting

#### Generate Report
```
POST /reporting.generateReport
```

Generates a report in PDF or Excel format.

**Request Body:**
```json
{
  "template": "commission",
  "format": "pdf",
  "dateRange": "30",
  "agentIds": ["agent-1", "agent-2"]
}
```

**Response:** Binary file (PDF or XLSX)

#### Schedule Report
```
POST /reporting.scheduleReport
```

Creates a recurring report schedule.

**Request Body:**
```json
{
  "name": "Weekly Commission Report",
  "template": "commission",
  "frequency": "weekly",
  "recipients": ["manager@example.com"]
}
```

#### Get Scheduled Reports
```
GET /reporting.getSchedules
```

Returns all active report schedules.

### Settings

#### Update Logo
```
POST /settings.uploadLogo
```

Uploads a custom logo for branding.

**Request Body:** Form data with file upload

#### Update Color Scheme
```
POST /settings.updateColorScheme
```

**Request Body:**
```json
{
  "scheme": "dark"
}
```

#### Export Data
```
POST /settings.exportData
```

Exports all tenant data as JSON.

#### Reset Data
```
POST /settings.resetData
```

Deletes all data for the current tenant (requires admin role).

### Audit Logging

#### Get Audit Logs
```
GET /auditLog.getLogs
```

Returns audit trail of all user actions.

**Query Parameters:**
- `limit`: Number of records (default: 100)
- `offset`: Pagination offset (default: 0)
- `action`: Filter by action type

**Response:**
```json
[
  {
    "id": 1,
    "action": "upload_viewed",
    "user": "admin@example.com",
    "timestamp": "2024-04-22T15:30:00Z",
    "details": "Viewed upload #123"
  }
]
```

### Dotloop Integration

#### Connect Dotloop Account
```
POST /dotloopOAuth.connectAccount
```

Initiates OAuth flow to connect a Dotloop account.

**Response:**
```json
{
  "authUrl": "https://dotloop.com/oauth/authorize?..."
}
```

#### Get Connected Accounts
```
GET /dotloopOAuth.getConnections
```

Returns all connected Dotloop accounts.

#### Sync Dotloop Data
```
POST /dotloopOAuth.syncTransactions
```

Manually triggers sync of Dotloop transactions.

## Error Handling

All errors follow a standard format:

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

### Common Error Codes

- `UNAUTHORIZED` - Missing or invalid authentication
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `VALIDATION_ERROR` - Invalid request parameters
- `INTERNAL_ERROR` - Server error

## Rate Limiting

API requests are rate-limited to 1000 requests per hour per tenant. Rate limit headers are included in responses:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1234567890
```

## Webhooks

### Real-Time Events

The API supports WebSocket connections for real-time updates:

```javascript
const socket = io('https://dotloopreport.com', {
  auth: { token: jwtToken }
});

socket.on('transaction:updated', (data) => {
  console.log('Transaction updated:', data);
});

socket.on('commission:calculated', (data) => {
  console.log('Commission calculated:', data);
});

socket.on('report:generated', (data) => {
  console.log('Report generated:', data);
});
```

## Pagination

List endpoints support pagination:

```
GET /dashboard.getMetrics?limit=50&offset=0
```

**Response Headers:**
```
X-Total-Count: 500
X-Page-Count: 10
```

## Data Types

### Transaction
```typescript
{
  id: string;
  loopId: string;
  loopName: string;
  loopStatus: 'Active' | 'Closed' | 'Archived';
  price: number;
  salePrice: number;
  commissionRate: number;
  commissionTotal: number;
  closingDate: Date;
  address: string;
  city: string;
  state: string;
}
```

### Commission Plan
```typescript
{
  id: string;
  name: string;
  splitPercentage: number;
  capAmount: number;
  postCapSplit: number;
  tiers: Array<{
    min: number;
    max: number;
    rate: number;
  }>;
}
```

### Team Member
```typescript
{
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'broker' | 'member' | 'agent';
  joinedAt: Date;
  isActive: boolean;
}
```

## Best Practices

1. **Cache Results**: Use the provided caching layer for frequently accessed data
2. **Batch Operations**: Use batch endpoints when possible to reduce API calls
3. **Handle Errors**: Implement proper error handling and retry logic
4. **Monitor Rate Limits**: Track rate limit headers and implement backoff
5. **Secure Tokens**: Never expose JWT tokens in client-side code
6. **Use WebSockets**: Subscribe to real-time events instead of polling

## Support

For API support and questions, contact: support@dotloopreport.com
