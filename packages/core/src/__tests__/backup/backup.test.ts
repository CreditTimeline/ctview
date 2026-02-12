import { describe, it, expect, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { existsSync, unlinkSync, mkdirSync, readdirSync, rmSync } from 'fs';
import { resolve } from 'path';
import { tmpdir } from 'os';
import { createDatabase } from '../../db/client.js';
import { createBackup } from '../../backup/backup.js';
import { listBackups } from '../../backup/list-backups.js';
import { validateBackup } from '../../backup/restore.js';
import { restoreBackup } from '../../backup/restore.js';

const tempDirs: string[] = [];
const tempFiles: string[] = [];

function tempDir(): string {
  const dir = resolve(
    tmpdir(),
    `ctview-backup-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(dir, { recursive: true });
  tempDirs.push(dir);
  return dir;
}

function tempDbPath(): string {
  const p = resolve(
    tmpdir(),
    `ctview-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`,
  );
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

  for (const d of tempDirs) {
    try {
      rmSync(d, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
  tempDirs.length = 0;
});

describe('createBackup', () => {
  it('creates backup and sidecar files', async () => {
    const dbPath = tempDbPath();
    createDatabase(dbPath);
    const backupDir = tempDir();

    const result = await createBackup(dbPath, backupDir);

    expect(existsSync(result.backupPath)).toBe(true);
    expect(existsSync(result.sidecarPath)).toBe(true);
    expect(result.sizeBytes).toBeGreaterThan(0);
    expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}$/);
    expect(result.ddlHash).toMatch(/^[0-9a-f]{16}$/);
  });

  it('creates backup directory if it does not exist', async () => {
    const dbPath = tempDbPath();
    createDatabase(dbPath);
    const backupDir = resolve(tempDir(), 'nested', 'dir');

    const result = await createBackup(dbPath, backupDir);

    expect(existsSync(result.backupPath)).toBe(true);
  });

  it('includes entity counts in sidecar', async () => {
    const dbPath = tempDbPath();
    createDatabase(dbPath);
    const backupDir = tempDir();

    const result = await createBackup(dbPath, backupDir);

    // Read the sidecar
    const { readFileSync } = await import('fs');
    const sidecar = JSON.parse(readFileSync(result.sidecarPath, 'utf-8'));
    expect(sidecar.entityCounts).toBeDefined();
    expect(typeof sidecar.entityCounts.credit_file).toBe('number');
  });
});

describe('listBackups', () => {
  it('returns empty array for non-existent directory', () => {
    const backups = listBackups('/tmp/nonexistent-ctview-dir');
    expect(backups).toEqual([]);
  });

  it('lists backups sorted newest first', async () => {
    const dbPath = tempDbPath();
    createDatabase(dbPath);
    const backupDir = tempDir();

    const r1 = await createBackup(dbPath, backupDir);
    // Wait over 1 second to guarantee different second-level timestamps
    await new Promise((resolve) => setTimeout(resolve, 1100));
    const r2 = await createBackup(dbPath, backupDir);

    const backups = listBackups(backupDir);

    expect(backups.length).toBe(2);
    // Newest first
    expect(backups[0].timestamp >= backups[1].timestamp).toBe(true);
  });

  it('handles missing sidecar gracefully', async () => {
    const dbPath = tempDbPath();
    createDatabase(dbPath);
    const backupDir = tempDir();

    await createBackup(dbPath, backupDir);

    // Delete the sidecar file
    const files = readdirSync(backupDir).filter((f) => f.endsWith('.json'));
    for (const f of files) {
      unlinkSync(resolve(backupDir, f));
    }

    const backups = listBackups(backupDir);
    expect(backups.length).toBe(1);
    expect(backups[0].backupFile).toMatch(/^ctview-backup-.*\.db$/);
  });
});

describe('validateBackup', () => {
  it('validates a valid backup', async () => {
    const dbPath = tempDbPath();
    createDatabase(dbPath);
    const backupDir = tempDir();

    const result = await createBackup(dbPath, backupDir);

    const validation = validateBackup(result.backupPath, result.ddlHash);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toEqual([]);
    expect(validation.backupDdlHash).toBe(result.ddlHash);
  });

  it('fails for non-existent file', () => {
    const validation = validateBackup('/tmp/nonexistent.db', 'abc123');
    expect(validation.valid).toBe(false);
    expect(validation.errors[0]).toContain('not found');
  });

  it('fails for DDL hash mismatch', async () => {
    const dbPath = tempDbPath();
    createDatabase(dbPath);
    const backupDir = tempDir();

    const result = await createBackup(dbPath, backupDir);

    const validation = validateBackup(result.backupPath, 'different_hash_000');
    expect(validation.valid).toBe(false);
    expect(validation.errors[0]).toContain('DDL hash mismatch');
  });

  it('passes when current hash is null (no current schema)', async () => {
    const dbPath = tempDbPath();
    createDatabase(dbPath);
    const backupDir = tempDir();

    const result = await createBackup(dbPath, backupDir);

    const validation = validateBackup(result.backupPath, null);
    expect(validation.valid).toBe(true);
  });
});

describe('restoreBackup', () => {
  it('restores a backup over the target database', async () => {
    const dbPath = tempDbPath();
    const targetPath = tempDbPath();

    // Use raw Database for full lifecycle control (no lingering Drizzle connection)
    const sourceDb = new Database(dbPath);
    sourceDb.pragma('journal_mode = WAL');
    sourceDb.exec(`
      CREATE TABLE app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL);
    `);
    sourceDb.exec(
      "INSERT INTO app_settings (key, value, updated_at) VALUES ('canary', 'original', datetime('now'))",
    );
    sourceDb.close();

    // Create backup with original data
    const backupDir = tempDir();
    const backup = await createBackup(dbPath, backupDir);

    // Create a target DB with modified data
    const targetDb = new Database(targetPath);
    targetDb.pragma('journal_mode = WAL');
    targetDb.exec(`
      CREATE TABLE app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL);
    `);
    targetDb.exec(
      "INSERT INTO app_settings (key, value, updated_at) VALUES ('canary', 'modified', datetime('now'))",
    );
    targetDb.close();

    // Restore the backup over the target
    restoreBackup(backup.backupPath, targetPath);

    // Verify original data is back
    const raw4 = new Database(targetPath, { readonly: true });
    const restored = raw4
      .prepare("SELECT value FROM app_settings WHERE key = 'canary'")
      .get() as { value: string };
    raw4.close();
    expect(restored.value).toBe('original');
  });

  it('throws for non-existent backup file', () => {
    expect(() => restoreBackup('/tmp/nonexistent.db', '/tmp/target.db')).toThrow(
      'not found',
    );
  });
});
