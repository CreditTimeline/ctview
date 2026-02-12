# CLAUDE.md

## Scope

Applies to `/packages/web/src/routes/api/v1` and descendants.

## Purpose

Defines conventions for versioned HTTP endpoints under `/api/v1/*`.

## Route Contracts

- Keep endpoints versioned under `/api/v1`.
- Validate request/query input with shared schemas from `@ctview/core` where available.
- Return consistent response envelopes via `apiSuccess` and `apiError` from `/packages/web/src/lib/server/api.ts`.
- Use explicit error codes (`ErrorCode.*`) instead of ad-hoc error strings.

## Handler Patterns

- Parse and validate input early.
- Return `VALIDATION_FAILED` on invalid user input.
- Catch unexpected exceptions and map to `INTERNAL_ERROR` with safe messaging.
- Keep handler logic thin; delegate domain work to `@ctview/core`.

## Pagination and Filtering

- Preserve existing `limit`/`offset` semantics for list endpoints.
- Keep filter names/types aligned with core query schemas and route docs.

## Verification

- For endpoint behavior changes, run relevant tests/checks from repo root:

```bash
pnpm test -- --run
pnpm check
```

- If endpoint changes affect UI flows, also run:

```bash
pnpm test:e2e
```
