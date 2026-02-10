# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies (pnpm 9.x required, Node >= 22)
pnpm install

# Development
pnpm dev                    # Start SvelteKit dev server (port 5173)
pnpm build                  # Build core then web (both packages)
pnpm preview                # Preview production build
pnpm check                  # SvelteKit type checking (svelte-check + svelte-kit sync)

# Testing
pnpm test                   # Run vitest (root-level, covers all packages)
pnpm test -- --run          # Single run (no watch mode)
pnpm test -- path/to/file   # Run a specific test file
pnpm test:e2e               # Playwright end-to-end tests (web package)

# Database
pnpm db:reset               # Delete local SQLite database (fresh start)

# Docker
docker compose -f docker/docker-compose.yml up --build                # SQLite (default)
docker compose -f docker/docker-compose.yml -f docker/docker-compose.postgres.yml up  # With Postgres sidecar
```

## Architecture

**pnpm monorepo** with two packages connected via `workspace:*` dependency:

- **@ctview/core** (`packages/core/`) — Pure TypeScript library with zero web framework dependencies. Contains database, schema, validation, ingestion, and types. Built with `tsc` to `dist/`. This package is designed to be reusable by CLI tools, API servers, or future clients.

- **@ctview/web** (`packages/web/`) — SvelteKit 2 application that imports @ctview/core. Uses adapter-node for production (Docker runs on port 3000). Svelte 5 runes syntax (`$props`, `$state`). Tailwind CSS 4 via Vite plugin. TanStack Svelte Table for data grids, ECharts for charts.

### Data flow: Ingestion pipeline

1. JSON credit file posted to `POST /api/v1/ingest`
2. `hooks.server.ts` validates optional `INGEST_API_KEY` bearer token
3. Core's `validateCreditFile()` runs Ajv validation against `spec/schemas/credittimeline-file.v1.schema.json` (JSON Schema Draft 2020-12)
4. Core's `checkReferentialIntegrity()` verifies cross-entity ID references
5. Core's `ingestCreditFile()` writes to database via Drizzle ORM

### Database

- **Drizzle ORM** with dialect switching: SQLite (better-sqlite3) is the default; Postgres support is planned
- Schema definitions live in `packages/core/src/schema/sqlite/` — 30+ tables covering provenance, identity, financial accounts, credit history, and analysis
- The canonical SQL DDL is in `spec/sql/credittimeline-v1.sql` and must stay in sync with Drizzle schema definitions
- Database is initialized as a singleton in `packages/web/src/lib/server/db.ts` and attached to SvelteKit's `event.locals` via `hooks.server.ts`
- IDs are generated with nanoid, timestamps are ISO 8601

### Spec directory

`spec/` is the source of truth for the data model:

- `schemas/` — JSON Schema for the credit file format and enums
- `sql/` — Canonical DDL (must match Drizzle schema)
- `examples/` — Valid sample payloads for testing
- `mappings/` — CSV crosswalks and normalization rules for converting vendor-specific data to canonical form

### Environment configuration

See `.env.example`. Key variables: `DATABASE_DIALECT` (sqlite|postgres), `DATABASE_URL`, `INGEST_API_KEY` (optional auth), `PORT` (default 3000).

## Conventions

- TypeScript strict mode is enabled project-wide
- Core package must remain framework-agnostic — no SvelteKit, Express, or HTTP imports
- The web package's server-only code lives under `src/lib/server/` and `src/routes/api/`
- API routes follow `/api/v1/*` namespacing
- Build order matters: core must build before web (`pnpm build` handles this)
