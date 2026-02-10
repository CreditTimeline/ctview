import type { PaginatedResult } from './types.js';

/**
 * Safely parse a JSON text column, returning null on failure.
 */
export function parseJsonColumn<T = unknown>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

/**
 * Build a paginated result from items array and total count.
 */
export function paginate<T>(
  items: T[],
  total: number,
  limit: number,
  offset: number,
): PaginatedResult<T> {
  return { items, total, limit, offset };
}
