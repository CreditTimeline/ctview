# CLAUDE.md

## Scope

Applies to `/` and all descendants unless a deeper `CLAUDE.md` overrides part of it.

## Repo Overview

- pnpm monorepo with two main packages.
- `packages/core`: framework-agnostic TypeScript domain/data layer.
- `packages/web`: SvelteKit 2 app consuming `@ctview/core`.
- `spec/` is the canonical data model source (`schemas`, `sql`, `examples`, `mappings`).
- Main ingestion flow: `POST /api/v1/ingest` -> validate -> referential checks -> persist.

## Repo-Wide Commands

Run from repository root:

```bash
pnpm install
pnpm dev
pnpm build
pnpm preview
pnpm check
pnpm test -- --run
pnpm test:e2e
pnpm lint
pnpm format
pnpm db:reset

docker compose -f docker/docker-compose.yml up --build
```

## Global Guardrails

- Keep TypeScript strict-safe across the workspace.
- Do not manually edit generated/build artifacts (`packages/*/dist/`, `packages/web/build/`, `packages/web/.svelte-kit/`, `node_modules/`).
- Keep behavior changes scoped; avoid cross-package refactors unless required.
- When changing runtime behavior, run targeted verification before finishing.

## Instruction Hierarchy

Use the closest `CLAUDE.md` for local rules, then fall back to parents.
If two rules conflict, the deeper file for the current path wins.

Child instruction files:
- `packages/core/CLAUDE.md`
- `packages/web/CLAUDE.md`
- `packages/web/src/routes/api/v1/CLAUDE.md`
- `spec/CLAUDE.md`
- `docker/CLAUDE.md`

## Definition of Done

- Changes are minimal, coherent, and scoped to the task.
- Relevant checks have been run for touched areas.
- Documentation/instruction updates are accurate for the edited paths.
