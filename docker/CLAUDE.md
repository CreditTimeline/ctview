# CLAUDE.md

## Scope

Applies to `/docker` and descendants.

## Purpose

Defines container build and runtime topology for local and deployment-style runs.

## Files

- `Dockerfile`: image build for `@ctview/web` runtime.
- `docker-compose.yml`: default app stack (SQLite-backed).
- `docker-compose.postgres.yml`: Postgres sidecar override.

## Rules

- Keep default compose behavior aligned with README expectations.
- SQLite profile should expose app on port `3000` and persist data volume.
- Postgres override should only add/override what is needed for dialect switch.
- Keep environment variable names aligned with `.env.example` and app config.

## Verification

Run from repo root after Docker changes:

```bash
docker compose -f docker/docker-compose.yml config
docker compose -f docker/docker-compose.yml -f docker/docker-compose.postgres.yml config
```

For runtime validation:

```bash
docker compose -f docker/docker-compose.yml up --build
docker compose -f docker/docker-compose.yml -f docker/docker-compose.postgres.yml up --build
```
