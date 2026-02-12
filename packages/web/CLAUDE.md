# CLAUDE.md

## Scope

Applies to `/packages/web` and descendants unless overridden by a deeper file.

## Purpose

`@ctview/web` is the SvelteKit 2 application layer for UI and HTTP routes.
It consumes `@ctview/core` rather than duplicating domain logic.

## Local Commands

Run from `/packages/web`:

```bash
pnpm dev
pnpm build
pnpm preview
pnpm check
pnpm test:e2e
```

Or from repo root:

```bash
pnpm -F @ctview/web dev
pnpm -F @ctview/web build
pnpm -F @ctview/web preview
pnpm -F @ctview/web check
pnpm -F @ctview/web test:e2e
```

## Rules

- Use Svelte 5 runes syntax consistently (`$props`, `$state`, `$derived`).
- Keep server-only code in `/packages/web/src/lib/server` and API route handlers.
- Keep UI components pure/presentational where practical; domain querying belongs in server loaders or API handlers.
- Avoid bypassing shared API helpers in `/packages/web/src/lib/server/api.ts` for structured responses.
- Preserve `/api/v1/*` namespace for public API endpoints.

## Change Guidance

- Page/data change: update matching `+page.server.ts` and `+page.svelte` together when needed.
- Server config/auth/db wiring changes: keep `hooks.server.ts` and `src/lib/server/*` coherent.
- Endpoint behavior changes under `/routes/api/v1` should follow local rules in `src/routes/api/v1/CLAUDE.md`.

## Verification

- Run `pnpm check` for typed Svelte/SvelteKit validation.
- Run targeted runtime checks (and e2e when route/page behavior changes).
