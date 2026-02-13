# ctview

A personal credit timeline viewer. Ingest credit report data from multiple bureaux into a normalised store, then browse and analyse it through a web UI or REST API.

## Key Features

- **Multi-bureau ingestion** — ingest JSON credit files from any supported bureau into a unified schema
- **Web dashboard** — interactive charts, tradeline heatmaps, score trends, and debt summaries
- **Full REST API** — programmatic access to all data with filtering, pagination, and export
- **Analysis engine** — automated anomaly detection and insight generation across tradelines
- **Export** — JSON round-trip, CSV downloads, and printable HTML dashboards
- **Backup/restore** — database backup with schema-version validation
- **SQLite-powered** — zero-dependency database, single-file storage

## Quick Start

### Development

```bash
# Prerequisites: Node.js 22+, pnpm 10+
corepack enable

git clone <repo-url> ctview
cd ctview
pnpm install
pnpm dev
# App available at http://localhost:5173

# Ingest a sample credit file
curl -X POST http://localhost:5173/api/v1/ingest \
  -H 'Content-Type: application/json' \
  -d @spec/examples/credittimeline-file.v1.example.json
```

### Docker

```bash
docker compose -f docker/docker-compose.yml up --build
# App available at http://localhost:3000
```

Data is persisted in a Docker volume (`ctview-data`).

## Documentation

| Document                                   | Description                                 |
| ------------------------------------------ | ------------------------------------------- |
| [Setup Guide](docs/setup-guide.md)         | Installation, configuration, and deployment |
| [API Guide](docs/api-guide.md)             | All REST endpoints with examples            |
| [Troubleshooting](docs/troubleshooting.md) | Common issues and solutions                 |

Interactive API documentation is available at `/api/v1/docs` (Scalar UI) when the app is running.

## Architecture

```
ctview/
  packages/
    core/     @ctview/core  — Pure TypeScript library (schema, ingestion, queries, analysis)
    sdk/      @ctview/sdk   — Generated TypeScript SDK for the REST API
    web/      @ctview/web   — SvelteKit 2 application (UI + API routes)
  spec/
    schemas/  — JSON Schema definitions (source of truth)
    sql/      — Canonical DDL
    examples/ — Sample credit file payloads
  docker/     — Dockerfile and compose configuration
  docs/       — User documentation
```

## Technology Stack

- **Runtime:** Node.js 22+
- **Language:** TypeScript (strict mode)
- **Frontend:** SvelteKit 2, Svelte 5, Tailwind CSS
- **Backend:** SvelteKit API routes consuming `@ctview/core`
- **Database:** SQLite via better-sqlite3
- **Validation:** Zod schemas with OpenAPI generation
- **Testing:** Vitest (unit/integration), Playwright (E2E)
- **Build:** pnpm workspaces monorepo

## Common Commands

| Command              | Description                            |
| -------------------- | -------------------------------------- |
| `pnpm dev`           | Start SvelteKit dev server (port 5173) |
| `pnpm build`         | Build all packages (core, sdk, web)    |
| `pnpm test -- --run` | Run all tests (single run)             |
| `pnpm test:e2e`      | Run Playwright E2E tests               |
| `pnpm check`         | SvelteKit type checking                |
| `pnpm lint`          | ESLint                                 |
| `pnpm format`        | Prettier check                         |
| `pnpm db:reset`      | Delete the local database              |

## Configuration

| Variable                | Default                    | Description                          |
| ----------------------- | -------------------------- | ------------------------------------ |
| `DATABASE_URL`          | `./data/credittimeline.db` | SQLite database path                 |
| `INGEST_API_KEY`        | _(unset)_                  | Bearer token for protected endpoints |
| `PORT`                  | `3000`                     | Server port (production)             |
| `LOG_LEVEL`             | `info`                     | `debug`, `info`, `warn`, or `error`  |
| `CORS_ALLOW_ORIGIN`     | _(empty)_                  | CORS allowed origin                  |
| `AUTO_MIGRATE`          | `true`                     | Auto-migrate schema on startup       |
| `BACKUP_DIR`            | _(unset)_                  | Backup directory path                |
| `RATE_LIMIT_INGEST_RPM` | `30`                       | Ingestion rate limit (requests/min)  |

See the [Setup Guide](docs/setup-guide.md) for detailed configuration documentation.

## License

[GPL-3.0](LICENSE)
