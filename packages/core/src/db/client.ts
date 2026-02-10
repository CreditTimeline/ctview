import { readFileSync, existsSync } from 'fs';
import { createHash } from 'crypto';
import { resolve } from 'path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../schema/sqlite/index.js';
import * as relations from '../schema/relations.js';

export interface CreateDatabaseOptions {
  /** Path to the spec/ directory containing the DDL SQL. Auto-detected if omitted. */
  specDir?: string;
  /** Skip running the DDL on startup. Default: false */
  skipMigration?: boolean;
}

/**
 * Locate the spec/ directory by walking up from cwd.
 * Works whether cwd is the repo root (Docker) or a nested package (dev mode).
 */
function findSpecDir(): string {
  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    const candidate = resolve(dir, 'spec', 'sql', 'credittimeline-v1.sql');
    if (existsSync(candidate)) return resolve(dir, 'spec');
    dir = resolve(dir, '..');
  }
  throw new Error(
    'Could not find spec/ directory. Set specDir option or ensure spec/sql/credittimeline-v1.sql exists.',
  );
}

// ---------------------------------------------------------------------------
// DDL staleness detection
// ---------------------------------------------------------------------------

function computeDdlHash(ddl: string): string {
  return createHash('sha256').update(ddl).digest('hex').slice(0, 16);
}

function getStoredDdlHash(sqlite: InstanceType<typeof Database>): string | null {
  try {
    const row = sqlite
      .prepare("SELECT value FROM app_settings WHERE key = 'ddl_hash'")
      .get() as { value: string } | undefined;
    return row?.value ?? null;
  } catch {
    // Table doesn't exist yet (brand-new database)
    return null;
  }
}

function hasExistingTables(sqlite: InstanceType<typeof Database>): boolean {
  const row = sqlite
    .prepare(
      "SELECT COUNT(*) AS count FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
    )
    .get() as { count: number };
  return row.count > 0;
}

function dropAllTables(sqlite: InstanceType<typeof Database>): void {
  sqlite.pragma('foreign_keys = OFF');
  const tables = sqlite
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
    )
    .all() as { name: string }[];
  for (const { name } of tables) {
    sqlite.exec(`DROP TABLE IF EXISTS "${name}"`);
  }
  sqlite.pragma('foreign_keys = ON');
}

function storeDdlHash(sqlite: InstanceType<typeof Database>, hash: string): void {
  sqlite
    .prepare(
      `INSERT INTO app_settings (key, value, updated_at)
       VALUES ('ddl_hash', ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    )
    .run(hash);
}

/**
 * Apply the DDL, automatically detecting and handling schema staleness.
 *
 * Computes a hash of the DDL content and compares it to a hash stored in
 * the database. If the schema is current the DDL is skipped entirely.
 * If the DDL has changed (or this is a legacy DB without a stored hash),
 * all tables are dropped and recreated from scratch.
 */
function applyDdl(sqlite: InstanceType<typeof Database>, ddl: string): void {
  const ddlHash = computeDdlHash(ddl);
  const storedHash = getStoredDdlHash(sqlite);

  if (storedHash === ddlHash) {
    return; // Schema is up to date
  }

  if (hasExistingTables(sqlite)) {
    console.warn(
      `[ctview] DDL ${storedHash ? 'change' : 'hash missing'} detected ` +
        `(${storedHash ?? 'none'} → ${ddlHash}). ` +
        'Recreating database schema. Development data has been cleared.',
    );
    dropAllTables(sqlite);
  }

  sqlite.exec(ddl);
  storeDdlHash(sqlite, ddlHash);
}

// ---------------------------------------------------------------------------

export function createDatabase(url: string, options?: CreateDatabaseOptions) {
  const sqlite = new Database(url);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  if (!options?.skipMigration) {
    const specDir = options?.specDir ?? findSpecDir();
    const ddlPath = resolve(specDir, 'sql', 'credittimeline-v1.sql');
    const ddl = readFileSync(ddlPath, 'utf-8');
    applyDdl(sqlite, ddl);
  }

  return drizzle(sqlite, { schema: { ...schema, ...relations } });
}

export type AppDatabase = ReturnType<typeof createDatabase>;
