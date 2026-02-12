/**
 * Reverse transforms for converting database values back to canonical JSON format.
 * These are the inverse of boolToInt() and toJsonText() from ingestion/transforms.ts.
 */

/** Reverse of boolToInt(): convert SQLite integer (0/1/null) back to boolean. */
export function intToBool(value: number | null): boolean | null {
  if (value === 1) return true;
  if (value === 0) return false;
  return null;
}

/** Reverse of toJsonText() for Record<string, unknown> (extensions, etc). */
export function parseExtensions(value: string | null): Record<string, unknown> | undefined {
  if (!value) return undefined;
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

/** Reverse of toJsonText() for arrays (roles, score_factors, etc). */
export function parseJsonArray<T>(value: string | null): T[] | undefined {
  if (!value) return undefined;
  try {
    const arr = JSON.parse(value);
    return Array.isArray(arr) ? (arr as T[]) : undefined;
  } catch {
    return undefined;
  }
}
