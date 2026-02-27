# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands are run from the repo root unless otherwise noted.

```bash
# Start everything (requires DB to be running)
pnpm dev                  # frontend :3000 + backend :4000 concurrently

# Database
pnpm db:up                # start PostgreSQL container (Docker)
pnpm db:down              # stop PostgreSQL container
pnpm db:migrate           # prisma migrate dev (creates migration + applies)
pnpm db:studio            # open Prisma Studio

# Build
pnpm build                # shared → api → web (in order)

# Per-package commands (run from repo root)
pnpm --filter api dev
pnpm --filter web dev
pnpm --filter api prisma:generate   # regenerate Prisma client after schema changes

# Schema changes workflow
# 1. Edit apps/api/prisma/schema.prisma
# 2. pnpm db:migrate  (prompts for migration name)
# 3. pnpm --filter api prisma:generate  (if not auto-run)
```

No test runner is configured yet.

## Architecture

### Monorepo layout
```
apps/api      NestJS backend (port 4000)
apps/web      React + Vite frontend (port 3000)
packages/shared  Shared TypeScript types (built to dist/)
docker/       docker-compose.yml for PostgreSQL 15
```

pnpm workspaces links the three packages. `packages/shared` must be built before `apps/api` and `apps/web` can consume it, which is why `pnpm build` runs shared first.

### Backend (apps/api)

Standard NestJS module-per-feature structure. Every feature has its own `*.module.ts`, `*.controller.ts`, `*.service.ts`, and `dto/` folder.

**`PrismaModule`** is `@Global()`, so `PrismaService` is available in every module without re-importing.

**Data flow:**
- `AssetsService` — CRUD for assets; each new asset automatically gets a `Holding` row created with zeroed values.
- `TransactionsService` — after every `create` or `remove`, it calls `recalculateHolding()` which replays all transactions for that asset chronologically to recompute `quantity` and `avgCostPrice`. **`currentPrice` is never touched by transaction logic** — it must be set manually via `PATCH /api/assets/:id/holding`.
- `PortfolioService` — read-only aggregation over `Asset + Holding`; computes `currentValue`, `returnAmount`, `returnRate` in memory (no extra DB columns).

All routes are prefixed `/api` (set globally in `main.ts`). CORS is locked to `http://localhost:3000`.

**Validation:** global `ValidationPipe` with `whitelist: true` and `transform: true`. DTOs use `class-validator` decorators.

### Frontend (apps/web)

**Routing:** React Router v6. Three routes: `/dashboard`, `/assets`, `/transactions`. Root redirects to `/dashboard`.

**API calls:** All HTTP requests go through `src/lib/api.ts` (axios instance with `baseURL: '/api'`). Vite proxies `/api` → `http://localhost:4000` in dev, so no CORS issues during development. All server state is managed with **TanStack Query** — cache keys follow the pattern `['assets']`, `['portfolio', 'summary']`, `['transactions', filterAssetId]`. Mutations call `queryClient.invalidateQueries` on success to keep related data in sync.

**UI components** in `src/components/ui/` are manually copied shadcn/ui primitives (Radix UI + Tailwind). Do not run `npx shadcn-ui add` — add components manually to maintain consistency.

**Display conventions in `src/lib/utils.ts`:**
- Korean stock color convention: gains = `text-red-500`, losses = `text-blue-500` (opposite of Western convention).
- `formatCurrency(value, currency)` — KRW formats with no decimals, USD with 2 decimals.
- `ASSET_TYPE_LABELS` / `ASSET_TYPE_COLORS` — single source of truth for display names and chart colors per `AssetType`.

### Data model

```
Asset (1) ──── (0..1) Holding       # quantity, avgCostPrice, currentPrice
Asset (1) ──── (*)    Transaction   # immutable buy/sell log
```

`Holding.avgCostPrice` is derived from transactions (recalculated on write), but `Holding.currentPrice` is user-managed (manual input or future price API). Portfolio returns are computed from these two fields at query time.

### Environment

`apps/api/.env` holds `DATABASE_URL` and `PORT`. This file is gitignored. PostgreSQL connection: `postgresql://fortuna:fortuna_secret@localhost:5432/fortuna_db`.
