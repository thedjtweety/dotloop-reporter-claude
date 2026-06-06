# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## What This Project Is

**Dotloop Reporter** is a full-stack real estate brokerage analytics platform. Brokers upload a CSV export from Dotloop (their transaction management system) and immediately get a rich analytics dashboard covering agent performance, pipeline health, commission management, recruiting, forecasting, and more.

The app runs entirely from a CSV upload — no Dotloop API integration is active yet. All analytics are computed client-side from the parsed CSV data held in React context.

---

## Commands

```bash
pnpm dev          # Start dev server (Vite + Express, hot reload) on port 3000
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

| Group | Path | Component | Status |
|---|---|---|---|
| Overview | `/` | `Dashboard` | Built |
| Overview | `/upload` | `Home` | Built (original CSV upload page) |
| Deals | `/agents` | `AgentsPage` | Built |
| Deals | `/commission` | `CommissionManagement` | Built |
| Deals | `/net-commission-report` | `NetCommissionReportPage` | Built |
| Deals | `/cda-builder` | `CDABuilderPage` | Built |
| Deals | `/cda-history` | `CDAHistoryPage` | Built |
| Deals | `/stuck-deals` | `StuckDealsPage` | Built |
| Deals | `/tasks` | `TasksPage` | Built |
| Analytics | `/trends` | `TrendsPage` | Built |
| Analytics | `/forecasting` | `ForecastingPage` | Built |
| Analytics | `/goals` | `GoalsPage` | Built |
| Analytics | `/timeline` | `TimelinePage` | Built |
| Analytics | `/velocity` | `VelocityPage` | Built |
| Analytics | `/compare` | `ComparePage` | Built |
| Analytics | `/market` | `MarketPage` | Built |
| Team | `/teams` | `TeamsPage` | Built |
| Team | `/contests` | `ContestsPage` | Built |
| Team | `/recruiting` | `RecruitingPage` | Built |
| Team | `/comparison` | `ComparisonPage` | Built — accessed from /compare when comparison mode active (no sidebar link) |
| Team | `/retention` | `RetentionPage` | Built |
| Team | `/lead-roi` | `LeadROIPage` | Built |
| Finance | `/agent-billing` | `AgentBillingPage` | Built |
| Finance | `/quickbooks` | `QuickBooksPage` | Built |
| Finance | `/templates` | `CommissionTemplates` | Built |
| Admin | `/reporting` | `ReportingComplete` | Built |
| Admin | `/data-quality` | `DataValidationRules` | Built |
| Admin | `/audit-log` | `AuditLog` | Built |
| Admin | `/admin` | `AdminDashboard` | Built |
| Settings | `/settings` | `SettingsComplete` | Built |

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
VITE_OAUTH_PORTAL_URL=http://localhost:3000
VITE_APP_ID=local-dev
OAUTH_SERVER_URL=http://localhost:3000

# Owner identity (required by some routes)
OWNER_NAME=Local Dev
OWNER_OPEN_ID=local-dev-owner

# Optional — leave blank to disable these features
BUILT_IN_FORGE_API_URL=        # AI/Forge integration
BUILT_IN_FORGE_API_KEY=
DOTLOOP_CLIENT_ID=             # Live Dotloop OAuth
DOTLOOP_CLIENT_SECRET=
DOTLOOP_REDIRECT_URI=http://localhost:3000/api/dotloop/callback
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

## Phase 1 — Complete (2026-06-06)

All 29 pages are built and polished. The following work was completed in Phase 1:

- All routes rendered through `SidebarLayout` with consistent nav
- Every page has: proper `h1` header + subtitle, `hasData` empty state with "Load Demo Data" button, theme-aware Tailwind classes (no hardcoded hex colors)
- Hardcoded hex colors (`#0d1117`, `#111827`, `#1e2d3d`, etc.) replaced with `bg-background`, `bg-secondary`, `border-border`, `text-foreground`, `text-muted-foreground` across all 30 active page files
- DataValidationRules: real-time data analysis + "Download Report" button added
- ForecastingPage: click-to-drill-down modal on agent projection table rows
- `/team-management` removed from routes (requires live auth/tRPC backend — not usable in CSV mode)
- TypeScript: 0 errors

**Known limitations before Phase 2:**
- CDA Builder "Generate PDF" button is not implemented (>30 min — deferred to Phase 2)
- All data is computed client-side from CSV; no persistence between sessions
- Demo mode uses synthetic data; real Dotloop API connection not yet active
- No user accounts — any broker can access any demo session

---

## Next Phase (Phase 2)

The following items are planned for production launch. All frontend pages are complete — this phase is infrastructure, auth, and live data.

1. **Dotloop OAuth integration** — Client ID and secret are ready. Wire up the existing `server/routers/dotloopApi.ts` router and `server/_core/oauth.ts` flow so brokers can connect their Dotloop account directly instead of uploading CSVs.

2. **Supabase database setup** — Replace the current MySQL/TiDB `DATABASE_URL` with Supabase (Postgres). Update `drizzle/schema.ts` for Postgres dialect, run migrations, and update `db.ts` connection helpers.

3. **Railway deployment** — Deploy the Express + Vite build (`pnpm build` → `dist/`) to Railway. Set all required env vars in Railway dashboard (DATABASE_URL, JWT_SECRET, TOKEN_ENCRYPTION_KEY, DOTLOOP_CLIENT_ID/SECRET, DOTLOOP_REDIRECT_URI pointing to prod domain).

4. **Custom domain** — Point `dotlooproport.com` to the Railway deployment. Update `DOTLOOP_REDIRECT_URI` and `VITE_OAUTH_PORTAL_URL` to the production domain.

5. **Real user auth** — Replace demo mode as the primary entry point with proper broker sign-up/login. The Manus OAuth scaffolding in `server/_core/auth.ts` is the starting point; replace or adapt it for email/password or Supabase Auth. Gate all pages behind `protectedProcedure` and remove the `activateDemoMode` fallback from the default landing experience (keep it as a "Try Demo" option).
