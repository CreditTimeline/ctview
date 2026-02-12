# CLAUDE.md

## Scope

Applies to `/docker` and descendants.

## Purpose

Defines container build and runtime topology for local and deployment-style runs.

## Files

- `Dockerfile`: image build for `@ctview/web` runtime.
- `docker-compose.yml`: app stack (SQLite-backed).

## Rules

- Keep default compose behavior aligned with README expectations.
- Compose should expose app on port `3000` and persist data volume.
- Keep environment variable names aligned with `.env.example` and app config.

## Verification

Run from repo root after Docker changes:

```bash
docker compose -f docker/docker-compose.yml config
```

For runtime validation:

```bash
docker compose -f docker/docker-compose.yml up --build
```
