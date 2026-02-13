# Setup Guide

## Prerequisites

- **Node.js** 22 or later
- **pnpm** 10 or later (enable via `corepack enable`)

## Development Setup

### 1. Clone and install

```bash
git clone <repo-url> ctview
cd ctview
pnpm install
```

### 2. Configure environment

Copy the example environment file and adjust as needed:

```bash
cp .env.example .env
```

See [Configuration](#configuration) for all available variables.

### 3. Start the dev server

```bash
pnpm dev
```

The app is available at `http://localhost:5173`. An SQLite database is created automatically at `./data/credittimeline.db`.

### 4. Ingest a sample credit file

```bash
curl -X POST http://localhost:5173/api/v1/ingest \
  -H 'Content-Type: application/json' \
  -d @spec/examples/credittimeline-file.v1.example.json
```

### 5. Run tests

```bash
# Unit and integration tests (single run)
pnpm test -- --run

# End-to-end tests (requires a full build first)
pnpm build
pnpm test:e2e
```

### 6. Other commands

| Command         | Description                                 |
| --------------- | ------------------------------------------- |
| `pnpm build`    | Build all packages (core, sdk, web)         |
| `pnpm check`    | TypeScript/Svelte type checking             |
| `pnpm lint`     | ESLint                                      |
| `pnpm format`   | Prettier check                              |
| `pnpm db:reset` | Delete the local database for a fresh start |

## Docker Deployment

### Build and run

```bash
docker compose -f docker/docker-compose.yml up --build
```

The app is available at `http://localhost:3000`. Data is persisted in a Docker volume (`ctview-data`).

### Build the image manually

```bash
docker build -f docker/Dockerfile -t ctview .
```

### Run with custom configuration

```bash
docker run -d \
  --name ctview \
  -p 3000:3000 \
  -v ctview-data:/data \
  -e DATABASE_URL=/data/credittimeline.db \
  -e INGEST_API_KEY=your-secret-key \
  -e BACKUP_DIR=/data/backups \
  ctview
```

### Volumes

| Path    | Purpose                                                |
| ------- | ------------------------------------------------------ |
| `/data` | Database storage (mount a volume here for persistence) |

## Configuration

All configuration is via environment variables. The app validates them on startup using Zod and will fail fast with clear error messages if values are invalid.

| Variable                | Default                    | Description                                                                                                         |
| ----------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`          | `./data/credittimeline.db` | Path to the SQLite database file                                                                                    |
| `INGEST_API_KEY`        | _(unset)_                  | Bearer token for protected endpoints (ingest, backup, restore, compact). If unset, these endpoints are open.        |
| `PORT`                  | `3000`                     | Server port (production builds only; dev uses 5173)                                                                 |
| `LOG_LEVEL`             | `info`                     | Logging level: `debug`, `info`, `warn`, or `error`                                                                  |
| `CORS_ALLOW_ORIGIN`     | _(empty)_                  | CORS allowed origin. `*` for all origins, blank for same-origin only, or a specific origin like `https://myapp.com` |
| `AUTO_MIGRATE`          | `true`                     | Auto-run database schema migration on startup (`true` or `false`)                                                   |
| `BACKUP_DIR`            | _(unset)_                  | Directory for database backups. Required for backup/restore endpoints to work.                                      |
| `RATE_LIMIT_INGEST_RPM` | `30`                       | Maximum ingestion requests per minute per client. Set to `0` to disable rate limiting.                              |

### Authentication

When `INGEST_API_KEY` is set, protected endpoints require a Bearer token:

```bash
curl -X POST http://localhost:3000/api/v1/ingest \
  -H 'Authorization: Bearer your-secret-key' \
  -H 'Content-Type: application/json' \
  -d @data.json
```

Protected endpoints: `POST /ingest`, `GET/POST /backup`, `POST /restore`, `POST /maintenance/compact`.
