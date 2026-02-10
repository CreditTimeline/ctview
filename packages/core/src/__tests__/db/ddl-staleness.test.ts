import { describe, it, expect, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { readFileSync, existsSync, unlinkSync } from 'fs';
import { resolve } from 'path';
import { tmpdir } from 'os';
import { createDatabase } from '../../db/client.js';

/** Resolve the spec dir from the repo root. */
function findSpecDir(): string {
  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    const candidate = resolve(dir, 'spec', 'sql', 'credittimeline-v1.sql');
    if (existsSync(candidate)) return resolve(dir, 'spec');
    dir = resolve(dir, '..');
  }
  throw new Error('Could not find spec/ directory');
}

const tempFiles: string[] = [];

function tempDbPath(): string {
  const p = resolve(tmpdir(), `ctview-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
  tempFiles.push(p);
  return p;
}

afterEach(() => {
  for (const f of tempFiles) {
    for (const suffix of ['', '-wal', '-shm']) {
      try {
        unlinkSync(f + suffix);
      } catch {
        // ignore
      }
    }
  }
  tempFiles.length = 0;
});

describe('DDL staleness detection', () => {
  it('applies DDL successfully to a fresh in-memory database', () => {
    // Core regression test — the original crash was caused by a stale DB
    // where the generated_insight table lacked the severity column
    expect(() => createDatabase(':memory:')).not.toThrow();
  });

  it('stores ddl_hash in app_settings after creation', () => {
    const dbPath = tempDbPath();
    createDatabase(dbPath);

    // Open raw connection to verify the hash was stored
    const raw = new Database(dbPath, { readonly: true });
    const row = raw.prepare("SELECT value FROM app_settings WHERE key = 'ddl_hash'").get() as {
      value: string;
    } | undefined;
    raw.close();

    expect(row).toBeDefined();
    expect(row!.value).toMatch(/^[0-9a-f]{16}$/);
  });

  it('skips DDL re-execution when hash matches (idempotent)', () => {
    const dbPath = tempDbPath();

    // First creation
    createDatabase(dbPath);

    // Insert a canary row
    const raw = new Database(dbPath);
    raw.exec(
      "INSERT INTO app_settings (key, value, updated_at) VALUES ('canary', 'alive', datetime('now'))",
    );
    raw.close();

    // Second creation with same DDL — should skip DDL, preserving data
    createDatabase(dbPath);

    const rawCheck = new Database(dbPath, { readonly: true });
    const row = rawCheck
      .prepare("SELECT value FROM app_settings WHERE key = 'canary'")
      .get() as { value: string } | undefined;
    rawCheck.close();

    expect(row?.value).toBe('alive');
  });

  it('recreates database when ddl_hash is missing (legacy DB)', () => {
    const dbPath = tempDbPath();

    // Simulate a legacy database: has tables but no ddl_hash
    const raw = new Database(dbPath);
    raw.pragma('journal_mode = WAL');
    raw.exec(`
      CREATE TABLE app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE generated_insight (
        insight_id TEXT PRIMARY KEY,
        subject_id TEXT NOT NULL,
        kind TEXT NOT NULL,
        summary TEXT,
        generated_at TEXT NOT NULL
      );
    `);
    // Note: generated_insight is missing the severity column
    raw.exec(
      "INSERT INTO app_settings (key, value, updated_at) VALUES ('canary', 'old-data', datetime('now'))",
    );
    raw.close();

    // createDatabase should detect the missing hash, drop, and recreate
    expect(() => createDatabase(dbPath)).not.toThrow();

    // Verify severity column now exists
    const rawCheck = new Database(dbPath, { readonly: true });
    const cols = rawCheck.prepare('PRAGMA table_info(generated_insight)').all() as {
      name: string;
    }[];
    // Canary should be gone (tables were dropped)
    const canary = rawCheck
      .prepare("SELECT value FROM app_settings WHERE key = 'canary'")
      .get() as { value: string } | undefined;
    rawCheck.close();

    expect(cols.map((c) => c.name)).toContain('severity');
    expect(canary).toBeUndefined();
  });

  it('recreates database when ddl_hash has changed', () => {
    const dbPath = tempDbPath();

    // Create a valid database with a fake hash
    const raw = new Database(dbPath);
    raw.pragma('journal_mode = WAL');
    const specDir = findSpecDir();
    const ddl = readFileSync(resolve(specDir, 'sql', 'credittimeline-v1.sql'), 'utf-8');
    raw.exec(ddl);
    // Overwrite the hash with a stale value
    raw.exec(
      "INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES ('ddl_hash', 'stale_hash_value', datetime('now'))",
    );
    raw.exec(
      "INSERT INTO app_settings (key, value, updated_at) VALUES ('canary', 'old-data', datetime('now'))",
    );
    raw.close();

    // createDatabase should detect the hash mismatch and recreate
    expect(() => createDatabase(dbPath)).not.toThrow();

    // Verify canary is gone (tables were dropped and recreated)
    const rawCheck = new Database(dbPath, { readonly: true });
    const canary = rawCheck
      .prepare("SELECT value FROM app_settings WHERE key = 'canary'")
      .get() as { value: string } | undefined;
    const hash = rawCheck
      .prepare("SELECT value FROM app_settings WHERE key = 'ddl_hash'")
      .get() as { value: string };
    rawCheck.close();

    expect(canary).toBeUndefined();
    expect(hash.value).not.toBe('stale_hash_value');
    expect(hash.value).toMatch(/^[0-9a-f]{16}$/);
  });
});
