import { createHash } from 'crypto';

/**
 * Convert a JSON boolean to a SQLite integer (0/1/null).
 * SQLite has no native boolean type — Drizzle stores them as INTEGER.
 */
export function boolToInt(value: boolean | null | undefined): number | null {
  if (value === true) return 1;
  if (value === false) return 0;
  return null;
}

/**
 * Serialize an object to JSON text for storage, or null if absent.
 */
export function toJsonText(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  return JSON.stringify(value);
}

/**
 * Compute SHA-256 hash of a credit file payload for dedup.
 * Uses JSON.stringify with sorted keys for deterministic output.
 */
export function computePayloadHash(data: unknown): string {
  const canonical = JSON.stringify(data, Object.keys(data as object).sort());
  return createHash('sha256').update(canonical).digest('hex');
}
