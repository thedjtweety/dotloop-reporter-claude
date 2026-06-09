# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## What This Project Is

**Dotloop Reporter** is a full-stack real estate brokerage analytics platform. Brokers upload a CSV export from Dotloop (their transaction management system) and immediately get a rich analytics dashboard covering agent performance, pipeline health, commission management, recruiting, forecasting, and more.

The app runs entirely from a CSV upload — no Dotloop API integration is active yet. All analytics are computed client-side from the parsed CSV data held in React context.

---

## Commands

```bash
pnpm dev          # Start dev server (Vite + Express, hot reload) on port 3001
pnpm build        # Build frontend (Vite) + backend (esbuild) to dist/
pnpm start        # Run production build
pnpm test         # Run all Vitest tests
pnpm test -- --watch                       # Watch mode
pnpm test -- src/lib/csvParser.test.ts     # Run a single test file
pnpm check        # TypeScript type-check (no emit) — run this after every change
pnpm format       # Prettier formatting
pnpm db:push      # Generate + apply Drizzle migrations
pnpm seed         # Seed sample data (scripts/seed-sample-data.mjs)
```

> **Important:** `node` and `pnpm` are at `/opt/homebrew/bin/`. If shell commands fail with "not found", use:
> `PATH="/opt/homebrew/bin:$PATH" ./node_modules/.bin/tsc --noEmit`

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Tailwind CSS 4, shadcn/ui, Recharts, Wouter |
| Backend | Express 4, tRPC 11, Zod, MySQL2 |
| Auth / DB (Phase 2) | Supabase (supabase-js 2.x) — RLS-enforced multi-tenancy |
| ORM | Drizzle ORM (MySQL / TiDB) |
| Build | Vite 7 (frontend), esbuild (backend) |
| State | React context (no Redux/Zustand) |
| Package manager | **pnpm** (never use npm/yarn) |

---

## Path Aliases

```
@        →  client/src/
@shared  →  shared/
```

---

## Project Structure

```
dotloop-reporter/
├── client/src/
│   ├── App.tsx                    # ALL route definitions live here
│   ├── pages/                     # One file per page/route
│   ├── components/                # 50+ reusable components
│   │   ├── SidebarLayout.tsx      # Main shell with sidebar nav + global filters
│   │   ├── charts/                # Recharts wrapper components
│   │   └── ui/                    # shadcn/ui primitives
│   ├── contexts/                  # React contexts (see below)
│   ├── lib/
│   │   ├── csvParser.ts           # CSV parsing + all core type interfaces
│   │   ├── formatUtils.ts         # formatCurrency, formatPercentage, formatNumber
│   │   ├── sampleData.ts          # generateSampleData(n) — demo mode
│   │   └── storage.ts             # idb-keyval IndexedDB helpers
│   └── const.ts                   # getLoginUrl() — guarded to handle missing env vars
├── server/
│   ├── _core/
│   │   ├── index.ts               # Express entry point; mounts tRPC at /api/trpc
│   │   ├── trpc.ts                # publicProcedure, protectedProcedure, adminProcedure
│   │   ├── context.ts             # Request context (user, tenantId)
│   │   ├── auth.ts / oauth.ts     # Manus OAuth flow
│   ├── routers.ts                 # Root tRPC router — merges all sub-routers
│   ├── routers/                   # Domain sub-routers (see list below)
│   ├── db.ts                      # Low-level DB query helpers
│   └── uploadDb.ts                # Upload + transaction CRUD
├── shared/
│   ├── types.ts                   # Re-exports Drizzle schema types + core errors
│   └── const.ts                   # Shared constants (cookie names, etc.)
├── drizzle/
│   ├── schema.ts                  # All MySQL table definitions
│   ├── relations.ts               # Drizzle relation definitions
│   └── migrations/                # Auto-generated SQL — do not edit manually
└── .env                           # Local env vars (gitignored)
```

---

## Routing

All routes are declared in `client/src/App.tsx` in the `SIDEBAR_ROUTES` array. Every sidebar route is automatically wrapped in `<SidebarLayout>`. To add a new page:

1. Create `client/src/pages/MyPage.tsx`
2. Import it in `App.tsx`
3. Add `{ path: '/my-path', component: MyPage }` to `SIDEBAR_ROUTES`
4. Add the nav item to `NAV_GROUPS` in `SidebarLayout.tsx`

### Current Route Map

#### Overview
- `/` → `Dashboard` — Full-featured with Action Queue, Goal Coverage, Pipeline, Projected to Close, Closing This Week, Activity, Recruiting Funnel, File Compliance, Market Pulse, Brokerage Health, AI Insights — ALL sections clickable with drill-downs
- `/upload` → `Home` — CSV upload + demo data

#### Deals & Pipeline
- `/agents` → `AgentsPage` — Podium, performance chart, full table with commission plan + buy% columns; all agent names clickable to AgentDetailModal
- `/commission` → `CommissionManagement` — 4 plan cards, Plans/Agents/Calculate/Audit/What-If tabs
- `/net-commission-report` → `NetCommissionReportPage`
- `/cda-builder` → `CDABuilderPage` — with prefill support
- `/cda-history` → `CDAHistoryPage`
- `/stuck-deals` → `StuckDealsPage` — CDA button on rows
- `/tasks` → `TasksPage`

#### Analytics
- `/trends` → `TrendsPage`
- `/forecasting` → `ForecastingPage`
- `/goals` → `GoalsPage`
- `/timeline` → `TimelinePage`
- `/velocity` → `VelocityPage`
- `/compare` → `ComparePage`
- `/market` → `MarketPage`

#### Team & Growth
- `/teams` → `TeamsPage`
- `/contests` → `ContestsPage`
- `/recruiting` → `RecruitingPage` — Kanban board with 6 columns: Lead / Contacted / Interviewing / Offer Extended / Onboarding / Declined
- `/retention` → `RetentionPage` — Churn risk scores, flight risk panel, retention rate chart
- `/lead-roi` → `LeadROIPage` — GCI vs cost by source, ROI multiplier, cost per closed deal
- `/comparison` → `ComparisonPage` — Accessed from /compare when comparison mode active (no sidebar link)

#### Finance & Ops
- `/agent-billing` → `AgentBillingPage` — A/R aging, billing items, assignments, invoices, 1099-NEC
- `/templates` → `CommissionTemplates`
- `/quickbooks` → `QuickBooksPage` — Export-focused, post transactions as journal entries

#### Reports & Admin
- `/reporting` → `ReportingComplete` — Custom report builder with 5 starter templates
- `/data-quality` → `DataValidationRules` — Field completeness ring, validation issues
- `/audit-log` → `AuditLog`
- `/admin` → `AdminDashboard` — Users, uploads, rate limits, SSO, webhooks, FUB sync
- `/settings` → `SettingsComplete` — Full hub with search, tabs, card grid, inline expansion forms, useSettings hook

All routes are fully built. `/team-management` was removed from routes (requires live auth backend). `/comparison` is reachable from `/compare` when comparison mode is active.

---

## React Contexts

### `useTransactionData()` — the primary data source for every page

Import: `import { useTransactionData } from '@/contexts/TransactionDataContext';`

```typescript
const {
  // Data
  allRecords,          // DotloopRecord[] — full unfiltered dataset
  filteredRecords,     // DotloopRecord[] — respects dateFilter + teamFilter (use this in pages)
  metrics,             // DashboardMetrics | null
  agentMetrics,        // AgentMetrics[] — pre-computed per-agent rollup
  commissionPlans,     // CommissionPlan[]
  agentAssignments,    // AgentAssignment[]

  // State flags
  hasData,             // boolean — false until CSV uploaded or demo activated
  isDemoMode,          // boolean
  activeDataSetName,   // string — CSV filename or 'Demo Data'

  // Filters (set by SidebarLayout, respected by filteredRecords)
  dateFilter,          // DateRangeFilter { from, to, label }
  teamFilter,          // TeamFilter { teamId, teamName }
  setDateFilter,
  setTeamFilter,

  // Summary for sidebar
  dataStatistics,      // { transactionCount, totalGCI, closeRate }
  teams,               // string[] — unique agent names extracted from allRecords

  // Actions
  activateDemoMode,    // () => void — loads 200 synthetic records
  setTransactionData,  // loads parsed CSV data
  clearTransactionData,

  // Comparison mode
  comparisonMode,
  comparisonDataSet,
  setComparisonDataSet,
  toggleComparisonMode,
  clearComparisonData,
  comparisonStatistics,
} = useTransactionData();
```

**Rule:** Always use `filteredRecords` in page components, not `allRecords`. The sidebar date + team filters operate on `filteredRecords`.

### `useCDAPanel()` — global Commission Disbursement Authorization slide-over

Import: `import { useCDAPanel } from '@/contexts/CDAContext';`

```typescript
const { openCDA, openCDAWithData, closeCDA, openCDAHistory, closeCDAHistory } = useCDAPanel();

// Open CDA pre-populated from a DotloopRecord:
openCDA(record, 'Optional label');

// Open CDA with manually constructed data:
openCDAWithData(cdaDataObject, 'Label');

// Open CDA history panel:
openCDAHistory();
```

### `useTheme()` — theme management

Import: `import { useTheme } from '@/contexts/ThemeContext';`

```typescript
const { theme, resolvedTheme, toggleTheme, setTheme } = useTheme();
// theme: 'light' | 'dark' | 'contrast' | 'system'
// Cycle: light → contrast → dark → system → light
```

---

## Theme System

Four themes: `light`, `dark`, `contrast` (same as dark), `system`. CSS custom properties defined in `client/src/index.css`.

**Always use CSS-variable-based Tailwind classes — never hardcode hex colors:**

| Use | Avoid |
|---|---|
| `bg-background` | `bg-[#0d1117]` |
| `bg-secondary` | `bg-[#0f1923]` |
| `text-foreground` | `text-white` |
| `text-muted-foreground` | `text-gray-400` |
| `border-border` | `border-[#1e2d3d]` |

Accent colors (`text-emerald-400`, `text-blue-400`, `text-yellow-400`, `text-red-400`, `text-purple-400`) work across all themes and are safe to use.

---

## Core Data Types

Defined in `client/src/lib/csvParser.ts`:

### `DotloopRecord` — one CSV row

```typescript
interface DotloopRecord {
  loopId: string;        loopName: string;      loopStatus: string;
  createdDate: string;   closingDate: string;   listingDate: string;
  offerDate: string;     address: string;       city: string;
  state: string;         propertyType: string;  leadSource: string;
  price: number;         salePrice: number;     commissionTotal: number;
  commissionRate: number; companyDollar: number;
  buySideCommission: number;  sellSideCommission: number;
  agents: string;        // comma-separated agent names
  earnestMoney: number;  referralSource: string; referralPercentage: number;
  complianceStatus: string;   tags: string[];
  buyerName?: string;    sellerName?: string;   // and more optional fields
  [key: string]: any;    // index signature — safe to access unknown columns
}
```

`loopStatus` values: `'Closed'`, `'Active'`, `'Active Listing'`, `'Under Contract'`, `'Archived'`

### `AgentMetrics` — pre-computed per-agent rollup

```typescript
interface AgentMetrics {
  agentName: string;         totalTransactions: number;   closedDeals: number;
  closingRate: number;       totalCommission: number;     averageCommission: number;
  totalSalesVolume: number;  averageSalesPrice: number;   averageDaysToClose: number;
  activeListings: number;    underContract: number;
  buySideCommission: number; sellSideCommission: number;
  buySidePercentage: number; sellSidePercentage: number;
  companyDollar: number;
}
```

### `DashboardMetrics` — brokerage-wide summary

```typescript
interface DashboardMetrics {
  totalTransactions: number;  activeListings: number;  underContract: number;
  closed: number;             archived: number;        totalSalesVolume: number;
  averagePrice: number;       totalCommission: number; totalCompanyDollar: number;
  averageDaysToClose: number; closingRate: number;     hasFinancialData: boolean;
  trends?: { /* MetricTrend per key metric */ };
}
```

---

## Formatting Utilities

Import from `@/lib/formatUtils`:

```typescript
formatCurrency(1234.56)    // "$1,234.56"
formatPercentage(10.5)     // "10.50%"
formatNumber(1234.5)       // "1,234.5"
```

For compact display in charts/cards, use an inline helper (not in the shared lib):

```typescript
function compactCurrency(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}
```

---

## Charts (Recharts)

Standard import pattern:

```typescript
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Legend,
} from 'recharts';
```

Standard Tooltip style (theme-aware):

```tsx
<Tooltip
  contentStyle={{
    background: 'var(--background)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--foreground)',
  }}
/>
```

Standard axis style:

```tsx
<XAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} axisLine={false} tickLine={false} />
<YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} axisLine={false} tickLine={false} width={55} />
<CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
```

Agent color palette (10 colors, use modulo for overflow):

```typescript
const AGENT_COLORS = [
  '#10b981','#3b82f6','#f59e0b','#ef4444','#8b5cf6',
  '#06b6d4','#f97316','#ec4899','#84cc16','#14b8a6',
];
```

---

## Backend — tRPC Procedures

All procedures are in `server/routers/` and merged in `server/routers.ts`. Use one of three base procedures from `server/_core/trpc.ts`:

- `publicProcedure` — no auth required
- `protectedProcedure` — requires valid session; `ctx.user` is guaranteed
- `adminProcedure` — requires admin role

**Multi-tenancy rule:** Every DB query must filter by `ctx.user.tenantId`. Never omit this.

```typescript
// Adding a new procedure
export const myRouter = router({
  getThings: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return db.select().from(things)
        .where(and(eq(things.id, input.id), eq(things.tenantId, ctx.user.tenantId)));
    }),
});
```

Call from frontend:

```typescript
const { data } = trpc.my.getThings.useQuery({ id: '123' });
const mutation = trpc.my.doThing.useMutation();
```

### Sub-router inventory

`uploads`, `dashboard`, `commission`, `commissionManagement`, `cda`, `cda-history`, `cda-builder`, `reporting`, `teamManagement`, `recruiting`, `analytics`, `goals`, `settings`, `branding`, `system`, `dotloopApi`, `dataValidation`, `syncHistory`, `connectionStatus`, `dataQualityAlerts`, `adminWebhooks`, `securityHardening`, `performanceOptimization`

---

## Database Schema (MySQL)

Tables in `drizzle/schema.ts` — every table has `tenantId`:

| Table | Purpose |
|---|---|
| `tenants` | Multi-tenant brokerage accounts |
| `users` | User accounts with roles |
| `uploads` | CSV upload history + metadata |
| `transactions` | Parsed transaction rows (mirrors DotloopRecord) |
| `commission_plans` | Commission plan definitions |
| `agent_assignments` | Agent → plan mappings |
| `cda_documents` | Generated CDAs |
| `cda_generated` | CDA generation history |
| `teams` / `user_teams` | Team groupings |
| `recruiting_prospects` | Recruiting pipeline candidates |
| `brokerage_branding` | Logo, colors, firm name |
| `audit_logs` | Action audit trail |
| `oauth_tokens` | Dotloop OAuth tokens |

---

## Environment Variables

```bash
# Required for local dev (copy to .env)
DATABASE_URL=mysql://root:password@localhost:3306/dotloop_reporter
JWT_SECRET=<min 32 chars>
TOKEN_ENCRYPTION_KEY=<min 32 chars>

# Auth (leave as localhost values to run without OAuth)
VITE_OAUTH_PORTAL_URL=http://localhost:3001
VITE_APP_ID=local-dev
OAUTH_SERVER_URL=http://localhost:3001

# Owner identity (required by some routes)
OWNER_NAME=Local Dev
OWNER_OPEN_ID=local-dev-owner

# Optional — leave blank to disable these features
BUILT_IN_FORGE_API_URL=        # AI/Forge integration
BUILT_IN_FORGE_API_KEY=
DOTLOOP_CLIENT_ID=             # Live Dotloop OAuth
DOTLOOP_CLIENT_SECRET=
DOTLOOP_REDIRECT_URI=http://localhost:3001/api/dotloop/callback
```

The app runs in "demo mode" without a database or OAuth configured — just leave those vars as the localhost defaults and click "Load Demo Data" in the UI.

---

## Key Patterns

### Adding a new page

```typescript
// 1. Create client/src/pages/MyPage.tsx
export default function MyPage() {
  const { filteredRecords, agentMetrics, hasData, activateDemoMode } = useTransactionData();
  if (!hasData) return <EmptyState onDemo={activateDemoMode} />;
  return <div className="space-y-6 pb-8">...</div>;
}

// 2. Import in App.tsx and add to SIDEBAR_ROUTES
// 3. Add nav item to NAV_GROUPS in SidebarLayout.tsx
```

### Standard page shell

```tsx
<div className="space-y-6 pb-8">
  {/* Header */}
  <div>
    <h1 className="text-2xl font-bold text-foreground">Page Title</h1>
    <p className="text-muted-foreground text-sm mt-0.5">Subtitle.</p>
  </div>

  {/* KPI card row */}
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
    <div className="bg-background border border-border rounded-xl p-4 flex items-center gap-3">
      ...
    </div>
  </div>

  {/* Content section */}
  <div className="bg-background border border-border rounded-xl p-5">
    ...
  </div>
</div>
```

### Standard empty state

```tsx
if (!hasData) {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center px-4">
      <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
        <SomeIcon className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-foreground text-xl font-semibold mb-2">No Data</h3>
      <p className="text-muted-foreground text-sm max-w-sm mb-6">Description.</p>
      <button onClick={activateDemoMode} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium">
        Load Demo Data
      </button>
    </div>
  );
}
```

### CSV export

```typescript
function exportCSV(rows: SomeType[]) {
  const headers = ['Col1', 'Col2'];
  const data = rows.map(r => [r.field1, r.field2]);
  const csv = [headers, ...data].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `export-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
```

### Avoid `JSX.Element` in type annotations

Use `ReactNode` instead:

```typescript
import { type ReactNode } from 'react';
// ✅
const STATUS_META: Record<string, { icon: ReactNode }> = { ... };
// ❌
const STATUS_META: Record<string, { icon: JSX.Element }> = { ... };
```

---

## TypeScript Rules

- Run `PATH="/opt/homebrew/bin:$PATH" ./node_modules/.bin/tsc --noEmit` after every change.
- Target: **0 errors** before committing.
- Use `(value as unknown) as TargetType` for double-cast when needed.
- `@ts-nocheck` exists on some legacy files — do not add it to new files.

---

## Pages Built in This Session

The following pages were designed and built with consistent patterns in this project:

| Page | File | What it does |
|---|---|---|
| Dashboard | `Dashboard.tsx` | 9-section brokerage overview: Action Queue, Goal Coverage, Metrics, Pipeline, Closing This Week, Activity, Market Pulse, Brokerage Health, AI Insights |
| Agents | `AgentsPage.tsx` | Leaderboard with podium, bar chart (GCI/Deals/Volume), sortable table, buy/sell split, radar chart drill-down, CSV export |
| Commission | `CommissionManagement.tsx` | 4 plan cards, 5 tabs (Plans/Agents/Calculate/Audit/What-If), net report banner, live What-If calculator |
| Recruiting | `RecruitingPage.tsx` | Funnel bars, 6-column Kanban, candidate cards with email/call/msg, stage dropdown, add form |
| Lead ROI | `LeadROIPage.tsx` | 4 KPI cards, GCI vs spend bar chart, monthly trend line chart, source breakdown table with ROI multiplier |
| Stuck Deals | `StuckDealsPage.tsx` | Risk filter chips (Critical/High/Medium/Low), sortable table, days-in-stage + threshold indicator |
| Data Quality | `DataValidationRules.tsx` | Circular score ring, 14-field completeness bars, issue detector with counts |
| Velocity | `VelocityPage.tsx` | Stage pipeline cards, monthly trend line, DOM histogram, agent velocity ranking table |
| Tasks | `TasksPage.tsx` | Task list with status toggle cycle, overdue detection, filter chips, new-task form |
| Agent Billing | `AgentBillingPage.tsx` | Fee invoices (desk/E&O/tech/transaction), stacked bar chart, summary + invoice tabs, CSV export |

---

## DrillDownModal — Universal Drill-Down Component

**File:** `client/src/components/DrillDownModal.tsx`
**Import alias (backward-compat):** `client/src/components/TxDrillModal.tsx`

> Note: the previous transaction-table component formerly at `DrillDownModal.tsx` was renamed to `LegacyTransactionDrillModal.tsx` (used by `Home.tsx` and `DataHealthCheck.tsx`). The name `DrillDownModal` now refers to the universal drill-down component below.

Every page that shows clickable metrics uses this component. It provides a two-level drill-down experience:
- **Level 1:** Paginated, searchable, filterable, sortable transaction list
- **Level 2:** Full property detail view for any clicked row

### Usage (any page)
```typescript
import { TxDrillModal, DrillTarget } from '@/components/TxDrillModal';

const [drillTarget, setDrillTarget] = useState<DrillTarget | null>(null);

// Open the modal:
setDrillTarget({ title: 'Closed Transactions', records: closedRecords });

// In JSX:
<TxDrillModal target={drillTarget} onClose={() => setDrillTarget(null)} />
```

### Props
| Prop | Type | Description |
|---|---|---|
| `target` | `DrillTarget \| null` | `null` = closed, non-null = open |
| `onClose` | `() => void` | Called when user closes the modal |

### DrillTarget
```typescript
interface DrillTarget {
  title: string;            // Modal header title
  records: DotloopRecord[]; // Transactions to show
  subtitle?: string;        // Optional override subtitle
}
```

### Sizing
The modal fills most of the screen: `DialogContent` uses `max-w-6xl w-[95vw] min-w-[800px]` with a fixed `height: 90vh`. The table has `min-width: 760px` and explicit per-column min-widths so columns never collapse on narrow content.

### Features
- Pagination: 25/50/100 rows, page size saved to localStorage
- Search: real-time filtering on address, agent, status
- Filters: status, agent, date range dropdowns
- Sort: click any column header to sort asc/desc
- Level 2: click any row to see full property detail (all DotloopRecord fields)
- Breadcrumb navigation + Backspace key to go back
- Export CSV (all filtered records or single record)
- Copy address to clipboard
- Keyboard: Escape closes, Backspace goes back one level

---

## SidebarLayout

`SidebarLayout.tsx` is the main shell. It:

- Reads `dateFilter`, `teamFilter`, `hasData`, `teams`, `isDemoMode`, `dataStatistics`, `activeDataSetName`, `clearTransactionData` from `useTransactionData()`
- Reads `openCDAHistory` from `useCDAPanel()`
- Renders the collapsible sidebar with 6 `NAV_GROUPS`
- Shows the date range picker and team filter in the sidebar
- Shows a demo mode badge when `isDemoMode` is true
- Shows a CDA History shortcut button in the bottom bar
- Toggles theme via `useTheme().toggleTheme()`

---

## Demo Mode

`activateDemoMode()` calls `generateSampleData(200)` from `client/src/lib/sampleData.ts`, which creates 200 realistic synthetic `DotloopRecord`s. All pages check `hasData` and show an empty state with a "Load Demo Data" button when false.

---

## Phase Status

### Phase 1 — COMPLETE (2026-06-06)

- ✅ All 29 pages built
- ✅ Universal DrillDownModal with Level 1 + Level 2
- ✅ Agent detail modal with full profile
- ✅ CDA prefill from any transaction
- ✅ Three themes (light/dark/contrast) on all pages
- ✅ All metric cards clickable with drill-downs
- ✅ Recruiting Kanban board
- ✅ Retention with churn risk scoring
- ✅ QuickBooks export page
- ✅ Data Quality with field completeness
- ✅ Custom Reports builder
- ✅ Full Settings hub with useSettings hook
- ✅ Zero TypeScript errors
- ✅ All code committed to GitHub

### Phase 2 — IN PROGRESS

- ✅ Settings Pass 2 (forms fully wired, useSettings, inline expansion pattern)
- ✅ Settings Pass 3 (QB mapping, webhooks, alerts thresholds, notification prefs exact match)
- ✅ Full E2E audit — all calculation bugs fixed (2026-06-09)
- ✅ Phase 2A — Supabase foundation + Dotloop OAuth + sync engine (2026-06-09)
- 📋 Dotloop OAuth integration — Phase 2A COMPLETE, integration testing next
  - Client ID and secret available (Zillow/Dotloop)
  - Callback URLs configured
  - Will replace CSV upload with live data sync
- 📋 Supabase database setup
  - Replace MySQL/demo data with real persistence
  - User accounts and multi-tenant support
- 📋 Real user authentication
  - Replace demo mode with real login
  - Multi-office/team support
- 📋 Railway deployment
  - Deploy to dotlooproport.com
  - Environment variables configuration
  - DNS setup

### Phase 3 — PLANNED

- 📋 Visual redesign
  - Custom brand identity
  - Non-generic component styling
  - Design reference: premium PropTech aesthetic
- 📋 Email report delivery
- 📋 SMS notifications
- 📋 Mobile app

---

## Verified Calculations & Formulas (E2E Audit 2026-06-09)

### `calculateMetrics()` — `client/src/lib/csvParser.ts`
- `totalSalesVolume` = sum of `salePrice` for **Closed/Sold records only**
- `averagePrice` = `totalSalesVolume / closed` (closed count, not all)
- `closingRate` = `(closed / totalTransactions) * 100` — stored as 0–100, not 0–1
- `averageDaysToClose` = mean of `(closingDate − listingDate)` for closed records; uses `listingDate || createdDate`
- `totalCommission` = sum of `commissionTotal` for **all records** (includes pipeline)

### `calculateAgentMetrics()` — `client/src/lib/csvParser.ts`
- `closedDeals` = records where `loopStatus` includes `'closed'` or `'sold'` (case-insensitive)
- `activeListings` = fuzzy `status.includes('active')` — matches both `'Active'` and `'Active Listings'`
- `totalCommission`, `totalSalesVolume`, `buySideCommission`, `sellSideCommission`, `companyDollar` — **closed records only**
- `averageCommission` = `totalCommission / closedDeals`
- `averageSalesPrice` = `totalSalesVolume / closedDeals`
- `averageDaysToClose` = mean of `(closingDate − listingDate)` using `listingDate || createdDate`

### `dataStatistics` — `TransactionDataContext.tsx`
- `totalGCI` maps to `metrics.totalCommission`
- `closeRate` maps to `metrics.closingRate` (already 0–100, sidebar does NOT multiply by 100)

### `commissionRate` storage convention
- Stored as percentage integer/float (e.g., `3` means 3%, not `0.03`)
- Pages must use `commissionTotal` directly; do not recalculate as `price × commissionRate`

### `loopStatus` values in use
- Demo data: `'Sold'`, `'Active'`, `'Under Contract'`, `'Archived'`
- Real Dotloop CSVs: `'Sold'`, `'Active Listings'`, `'Under Contract'`, `'Archived'`
- All status checks must handle both forms; use fuzzy `status.includes('active')` for active listings

## Known Limitations Before Phase 2

- **Action Queue** (Dashboard): hardcoded — will be data-driven with real backend
- **Activity Right Now** (Dashboard): hardcoded demo values
- **Recruiting Funnel** (Dashboard): hardcoded — real data from recruiting table in DB
- **Market Pulse** (Dashboard): hardcoded — will use live market API in Phase 3
- **File Compliance score** (Dashboard): hardcoded 92% — will compute from `complianceStatus` field
- **Agent Retention** (Brokerage Health): hardcoded 96% — needs historical data
- **Q2 Target** (Dashboard): auto-calculated as 1.25× current performance — should come from Goals settings
- **Caps Collected**: estimated as `totalGCI × 8%` — will use real plan cap data in Phase 2
- **sampleData commissionRate**: stored as `3` (3%) — consistent with normalizeRecord behavior

## Test CSV Location

`public/test-data/comprehensive-test.csv` — 55 records across:
- 43 Sold/Closed deals (2024, various prices $155K–$1.85M)
- 5 Under Contract deals (2025, with future closing dates)
- 5 Active Listings (2025, no commission data)
- 2 Archived records
- 5 unique agents (Sarah Miller, James Wilson, Michael Chen, Emily Davis, Robert Taylor + 3 more)
- Multiple cities/states, commission rates 2.5%–3.5%
- Various property types, lead sources, compliance statuses

---

## Key Components Built

### DrillDownModal (`client/src/components/DrillDownModal.tsx`)

Universal two-level drill-down modal used across the entire app.

- **Level 1:** Paginated transaction list (25/50/100 per page)
- **Level 2:** Full property detail view when a row is clicked
- **Props:** `title`, `records`, `onClose`, `onAgentClick` (optional)
- **Features:** real-time search, status/agent/date filters, sortable columns, CSV export, breadcrumb navigation
- Pagination preference saved to localStorage
- **ALWAYS use this component for transaction drill-downs — never create a custom modal for transactions**

### AgentDetailModal

Full agent profile drill-down:

- KPI cards: closed deals, GCI, volume, avg days
- Buy/sell split bar
- Performance tab with monthly chart
- Transactions tab using DrillDownModal table
- Triggered by clicking any agent name anywhere in the app

### CDA Prefill Pattern

Any transaction table can send data to CDA Builder:

- CDA button on every transaction row
- Stores prefill data to localStorage key `"cda-prefill"`
- Navigates to `/cda-builder`
- `CDABuilderPage` reads and clears prefill on mount
- Shows green banner confirming prefill loaded

### `useSettings` Hook (`client/src/hooks/useSettings.ts`)

Central settings management. All settings stored in typed localStorage keys.

Sections: `brokerage`, `branding`, `cdaLogo`, `commissionDefaults`, `locale`, `reporting`, `alerts`, `alertRules`, `notifications`, `notificationPrefs`, `leadSources`, `leadSourceCosts`, `uploadLimits`, `smtp`, `webhooks`, `integrations`, `qb`, `qbAlerts`

```typescript
const { settings, update, resetAll } = useSettings();
```

Settings are wired into: sidebar brokerage name, logo display, accent color, auto-refresh, alert thresholds, lead source lists, upload limits.

`FormProps` interface for all settings form components:
```typescript
interface FormProps {
  settings: SettingsConfig;
  update: <K extends keyof SettingsConfig>(section: K, value: SettingsConfig[K]) => void;
  showToast: (msg: string) => void;
  allRecords?: DotloopRecord[];
  agentMetrics?: AgentMetrics[];  // needed by QuickBooksForm for agent mapping table
  onClose: () => void;
}
```

Key types added in Settings Pass 3: `QbSettings`, `QbAlertSettings`, `QbAccountMapping`, `QbAgentMapping`, `QbBillingItem`, `AlertRule`, `NotificationPrefs`.

### Settings Page Inline Expansion Pattern

Settings cards in `SettingsComplete.tsx` expand **inline on the same page** when clicked — they do NOT use sheets/drawers. Key implementation details:

- `expandedCard: string | null` state in the main component
- `SectionBlock` receives `expandedCard` and `setExpandedCard`; only one card expanded globally at a time
- If the expanded card belongs to a section, the panel renders below that section's card grid
- Panel header: card title + `^ Close` button that sets `expandedCard = null`
- `expandedCard` resets to `null` when the tab changes or search is cleared
- `Brokerage` and `Branding` cards have a view-mode (shows current values + Edit button) before switching to edit mode
- `reset-data` card intercepts in `setExpandedCard` and opens a Dialog instead

```tsx
// Clicking a card:
setExpandedCard(prev => prev === card.id ? null : card.id);

// Panel rendered below the grid in the matching section:
{expandedInThisSection && (
  <div className="mt-3 border border-border rounded-xl bg-background">
    <div className="flex items-center justify-between px-5 py-3 border-b border-border">
      <p>{expandedCardDef.title}</p>
      <button onClick={() => setExpandedCard(null)}>^ Close</button>
    </div>
    <div className="px-5 py-5">
      {renderFormBody(expandedCard, formProps)}
    </div>
  </div>
)}
```

---

## Clickability Rules

**EVERY metric, card, chart bar, and data point that represents transactions MUST open DrillDownModal. This is a hard rule — no exceptions.**

Standard pattern:

```typescript
const [modalOpen, setModalOpen] = useState(false);
const [modalRecords, setModalRecords] = useState<DotloopRecord[]>([]);
const [modalTitle, setModalTitle] = useState('');

const openModal = (title: string, records: DotloopRecord[]) => {
  setModalTitle(title);
  setModalRecords(records);
  setModalOpen(true);
};

// On any clickable element:
onClick={() => openModal('Closed Transactions', closedRecords)}
```

Status filter patterns (must match exactly):

```typescript
const closedRecords = records.filter(r =>
  r.loopStatus === 'Sold' || r.loopStatus === 'Closed' ||
  r.status === 'Sold' || r.status === 'Closed'
);
const activeRecords = records.filter(r =>
  r.loopStatus === 'Active Listings' || r.status === 'Active Listings'
);
const ucRecords = records.filter(r =>
  r.loopStatus === 'Under Contract' || r.status === 'Under Contract'
);
```

---

## CDA Button Rule

**Every table showing individual transactions MUST have a CDA button as the last column.**

```tsx
<button
  onClick={() => {
    localStorage.setItem('cda-prefill',
      JSON.stringify({
        address: record.address,
        city: record.city,
        state: record.state,
        salePrice: record.salePrice,
        closingDate: record.closingDate,
        agentName: record.agentName,
        commissionRate: record.commissionRate,
        commissionTotal: record.commissionTotal,
        buySide: record.buySide,
        sellSide: record.sellSide,
        companyDollar: record.companyDollar,
      })
    );
    navigate('/cda-builder');
  }}
  className="px-2 py-1 text-xs border border-accent text-accent hover:bg-accent hover:text-white rounded transition-colors"
  title="Build CDA for this transaction"
>
  CDA
</button>
```

---

## Wallboard / Display Mode

The Display Mode settings page (in Settings hub) controls a full-screen rotating dashboard for office TVs. Key features to implement in Phase 2:

- Enable toggle with shareable kiosk URL
- Draggable scenes rotation order: Top Producers, Active Contests, Goal Progress, Recent Closings, Monthly Volume
- Theme presets: Brand Bold, Newsroom, Stadium, Midnight, High Contrast
- Accent color picker
- Background: Brand / Solid / Gradient / Dots / Grid / Image
- Logo placement: Top left / Watermark / Hidden
- Typography: Compact / Default / Jumbo
- Headline announcement text (0/240 chars)
- Closing celebration overlay (confetti toggle)
- Corner widgets: Clock and/or Weather
- Agent photos upload (match by filename)
- Rotation interval slider (5s–120s)
- Chime on new closing toggle
- Active hours schedule with timezone
- Holiday management

---

## Design Reference Process

When building UI that should match the Replit reference version:

1. Screenshot the Replit page using Chrome extension
2. Share screenshot in Claude.ai chat for analysis
3. Claude.ai writes detailed build prompt from screenshot
4. Paste prompt into Claude Desktop to build
5. Compare result in browser at `localhost:3001`
6. Iterate as needed

- **Reference app:** `dotloopreport.replit.app`
- **Our app:** `localhost:3001` (`pnpm dev`)
- **GitHub:** `github.com/thedjtweety/dotloop-reporter`

---

## Git Workflow

SSH is configured. Push after every build session:

```bash
cd ~/Desktop/dotloop-reporter
git push origin main
```

Quick alias available: `gp` (if configured).

Claude Code/Desktop auto-commits after builds. Always push to keep GitHub current. Never commit `.env` files (already in `.gitignore`).
