# CLAUDE.md

## Scope

Applies to `/packages/core` and descendants unless overridden by a deeper file.

## Purpose

`@ctview/core` is the framework-agnostic TypeScript domain layer.
It owns schema definitions, ingestion, validation, DB access, and query functions.

## Local Commands

Run from `/packages/core`:

```bash
pnpm build
pnpm test
```

Or from repo root:

```bash
pnpm -F @ctview/core build
pnpm -F @ctview/core test
```

## Rules

- Keep this package runtime-framework-agnostic.
- Do not import SvelteKit, route handlers, or web UI code into core.
- Keep canonical SQL in `/spec/sql/credittimeline-v1.sql` aligned with Drizzle schema in `/packages/core/src/schema/sqlite`.
- Preserve ingestion invariants: validate payload shape before persistence, enforce referential integrity checks, and keep source import metadata attached to persisted entities.

## Change Guidance

- Schema change: update Drizzle schema, relations/types, and any affected queries/ingestion code.
- Query contract change: update parameter/result types and downstream usage expectations.
- Validation change: keep errors actionable and deterministic.

## Verification

- Run core tests for changes to ingestion, validation, queries, or schema.
- If core changes affect web behavior, also run repo-level build/tests from root.
