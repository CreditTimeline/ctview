# CLAUDE.md

## Scope

Applies to `/spec` and descendants.

## Purpose

`/spec` is the canonical data-model source for ctview.
Implementation code in `packages/core` and `packages/web` must conform to this directory.

## Subdirectories

- `schemas/`: JSON Schema definitions for payloads and enums.
- `sql/`: canonical DDL (`credittimeline-v1.sql`).
- `examples/`: representative valid payload examples.
- `mappings/`: normalization and crosswalk rules.

## Rules

- Treat SQL and schema definitions here as source-of-truth artifacts.
- Keep `/packages/core/src/schema/sqlite/*` aligned with SQL DDL changes.
- Keep examples consistent with schema updates.
- Keep mappings deterministic and machine-readable (stable headers/keys).
- Do not mix implementation logic into `/spec`.

## Change Guidance

- Schema change: update impacted examples and any enum/crosswalk references.
- SQL change: reflect equivalent structure/constraints in Drizzle schema.
- Mapping change: verify ingestion transformations still map into canonical model.

## Verification

Run relevant checks from repo root after spec changes:

```bash
pnpm test -- --run
pnpm build
```
