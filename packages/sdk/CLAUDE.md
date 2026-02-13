# CLAUDE.md

## Scope

Applies to `/packages/sdk` and descendants.

## Purpose

`@ctview/sdk` is a lightweight TypeScript HTTP client wrapping all ctview API endpoints.
Zero runtime dependencies — uses the platform `fetch` API.

## Rules

- Only `import type` from `@ctview/core` (zero runtime dependency on core)
- Works in Node, browser, and Deno (standard fetch)
- All methods are typed with request params and response types from core
