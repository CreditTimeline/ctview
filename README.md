# ctview

A personal credit timeline viewer. Ingest credit report data from multiple bureaux into a normalised store, then browse and analyse it through a web UI or REST API.

## Prerequisites

- **Node.js** >= 22
- **pnpm** 9.x (`corepack enable && corepack prepare pnpm@9.15.4 --activate`)

## Quick start (development)

```bash
# Install dependencies
pnpm install

# Start the dev server (http://localhost:5173)
pnpm dev
```

By default the app uses an SQLite database at `./data/credittimeline.db`. Copy `.env.example` to `.env` to customise.

### Ingest a credit file

Post a JSON credit file to the ingestion endpoint:

```bash
curl -X POST http://localhost:5173/api/v1/ingest \
  -H 'Content-Type: application/json' \
  -d @spec/examples/credittimeline-file.v1.example.json
```

If `INGEST_API_KEY` is set, add `-H 'Authorization: Bearer <key>'`.

## Docker

### SQLite (default)

```bash
docker compose -f docker/docker-compose.yml up --build
```

The app is available at `http://localhost:3000`. Data is persisted in a named Docker volume (`ctview-data`).

### With Postgres

```bash
docker compose -f docker/docker-compose.yml \
               -f docker/docker-compose.postgres.yml \
               up --build
```

This starts a Postgres 17 sidecar and configures ctview to use it.

## Project structure

```
packages/
  core/     @ctview/core  — Pure TypeScript library (DB, schema, ingestion, queries)
  web/      @ctview/web   — SvelteKit 2 application
spec/
  schemas/  — JSON Schema definitions (source of truth)
  sql/      — Canonical DDL
  examples/ — Sample credit file payloads
docker/     — Dockerfile and compose files
```

## Common commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start SvelteKit dev server (port 5173) |
| `pnpm build` | Build core then web |
| `pnpm test -- --run` | Run all tests (single run) |
| `pnpm check` | SvelteKit type checking |
| `pnpm lint` | ESLint |
| `pnpm format` | Prettier check |

## API

All endpoints are under `/api/v1/`. Key routes:

| Method | Path | Description |
|--------|------|-------------|
| POST | `/ingest` | Ingest a JSON credit file |
| GET | `/dashboard` | Aggregated overview |
| GET | `/subjects` | List subjects |
| GET | `/tradelines` | List tradelines (filterable) |
| GET | `/tradelines/:id` | Full tradeline detail |
| GET | `/tradelines/:id/metrics` | Monthly metric time series |
| GET | `/searches` | Search record history |
| GET | `/scores` | Credit score history |
| GET | `/imports` | Import batch history |
| GET | `/addresses` | Address history |
| GET | `/insights` | Generated insights |
| GET | `/health` | Liveness probe |
| GET | `/ready` | Readiness probe |

List endpoints support `limit` and `offset` query parameters. Most also accept domain-specific filters — see the Zod schemas in `packages/core/src/queries/types.ts` for details.

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_DIALECT` | `sqlite` | `sqlite` or `postgres` |
| `DATABASE_URL` | `./data/credittimeline.db` | DB path (SQLite) or connection string (Postgres) |
| `INGEST_API_KEY` | *(unset)* | Bearer token for `/api/v1/ingest`. If unset, ingestion is open. |
| `PORT` | `3000` | Server port (production) |
| `CORS_ALLOW_ORIGIN` | *(unset)* | CORS allowed origin. `*` for all, blank for same-origin only. |
| `LOG_LEVEL` | `info` | `debug`, `info`, `warn`, or `error` |

## Troubleshooting

### `SqliteError: no such column` on startup

The app auto-detects DDL schema changes and recreates the database when needed.
To reset the database manually:

```bash
pnpm db:reset
```

## License

[GPL-3.0](LICENSE)
