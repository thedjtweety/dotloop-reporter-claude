# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start dev server (Vite + Express, hot reload)
pnpm build        # Build frontend (Vite) + backend (esbuild) to dist/
pnpm start        # Run production build
pnpm test         # Run all Vitest tests
pnpm test -- --watch                    # Watch mode
pnpm test -- csvValidator.test.ts       # Run single test file
pnpm check        # TypeScript type check (no emit)
pnpm format       # Prettier formatting
pnpm db:push      # Generate + apply Drizzle migrations
pnpm seed         # Seed sample data from scripts/seed-sample-data.mjs
```

## Architecture

Full-stack TypeScript monorepo. The Express server serves both the API and (in dev) proxies to Vite, or (in prod) serves the static build.

**Entry point:** `server/_core/index.ts` — starts Express, mounts tRPC at `/api/trpc`, attaches Vite middleware (dev) or static files (prod).

### Path aliases
- `@` → `client/src/`
- `@shared` → `shared/`

### Backend (`server/`)
- **`routers.ts`** — Root tRPC router that imports and merges ~30 sub-routers. Start here to find any API procedure.
- **`_core/trpc.ts`** — Defines `publicProcedure`, `protectedProcedure`, and `adminProcedure`. All procedures use one of these three.
- **`_core/context.ts`** — Request context creation (user session, tenant info injected here).
- **`_core/auth.ts` / `oauth.ts`** — Manus OAuth authentication flow.
- **`db.ts`** — Low-level database query helpers.
- **`uploadDb.ts`** — Upload and transaction CRUD operations.
- **`routers/`** — Domain sub-routers (uploads, dashboard, commission, CDA, reporting, team management, etc.).

### Frontend (`client/src/`)
- **`App.tsx`** — All route definitions (wouter-based routing).
- **`pages/`** — Page-level components, one per route.
- **`components/`** — 50+ reusable components. Charts are in `components/charts/`.
- **`lib/`** — Pure utilities: `csvParser.ts`, `formatUtils.ts`, etc.
- **`_core/hooks/useAuth.ts`** — Authentication hook used across pages.

### Shared (`shared/`)
- **`types.ts`** — Re-exports Drizzle schema types and core errors. Import shared types from here.
- **`const.ts`** — Shared constants (cookie names, etc.).

### Database (`drizzle/`)
- **`schema.ts`** — All MySQL table definitions. Every table has a `tenantId` column for multi-tenant isolation.
- **`relations.ts`** — Drizzle relation definitions.
- **`migrations/`** — Auto-generated SQL migration files (do not edit manually).

## Key Patterns

**Multi-tenancy:** All data is scoped by `tenantId`. Queries must always filter by `ctx.user.tenantId` — never omit this filter.

**Adding a new API procedure:** Define it in the appropriate sub-router in `server/routers/`, import and merge it in `server/routers.ts`, then call it from the frontend via `trpc.<namespace>.<procedure>.useQuery()` or `.useMutation()`.

**Adding a new chart:** Create component in `client/src/components/charts/`, use `h-64 sm:h-72 md:h-80` responsive height classes, wire up a drill-down handler if the chart should support click-through.

**Tests:** Vitest runs in node environment. Test files live alongside source in `server/` and `client/`. The `server/__tests__/` directory holds integration tests.
