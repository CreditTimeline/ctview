import { mkdirSync, writeFileSync, statSync } from 'fs';
import { resolve } from 'path';
import Database from 'better-sqlite3';
import { noopLogger, type Logger } from '../logger.js';

export interface BackupResult {
  backupPath: string;
  sidecarPath: string;
  sizeBytes: number;
  timestamp: string;
  ddlHash: string | null;
}

export interface BackupMetadata {
  backupFile: string;
  timestamp: string;
  sizeBytes: number;
  ddlHash: string | null;
  entityCounts?: Record<string, number>;
}

/**
 * Create a consistent backup of the SQLite database.
 * Uses better-sqlite3's .backup() method for atomic snapshots.
 * Writes timestamped backup files: ctview-backup-YYYY-MM-DDTHH-mm-ss.db
 * Also writes JSON sidecar with metadata.
 */
export async function createBackup(
  databasePath: string,
  backupDir: string,
  logger?: Logger,
): Promise<BackupResult> {
  const log = logger ?? noopLogger;
  log.info({ databasePath, backupDir }, 'starting backup');
  mkdirSync(backupDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupFile = `ctview-backup-${timestamp}.db`;
  const backupPath = resolve(backupDir, backupFile);
  const sidecarPath = resolve(backupDir, `ctview-backup-${timestamp}.json`);

  // Open source DB to read metadata before backup
  const sourceDb = new Database(databasePath, { readonly: true });

  let ddlHash: string | null = null;
  try {
    const row = sourceDb.prepare("SELECT value FROM app_settings WHERE key = 'ddl_hash'").get() as
      | { value: string }
      | undefined;
    ddlHash = row?.value ?? null;
  } catch {
    // Table may not exist
  }

  const entityCounts: Record<string, number> = {};
  const tables = [
    'credit_file',
    'import_batch',
    'tradeline',
    'search_record',
    'credit_score',
    'address',
    'public_record',
  ];
  for (const table of tables) {
    try {
      const row = sourceDb.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as {
        count: number;
      };
      entityCounts[table] = row.count;
    } catch {
      // Table may not exist
    }
  }

  // Perform the backup
  await sourceDb.backup(backupPath);
  sourceDb.close();

  const stats = statSync(backupPath);

  // Write sidecar metadata
  const metadata: BackupMetadata = {
    backupFile,
    timestamp,
    sizeBytes: stats.size,
    ddlHash,
    entityCounts,
  };
  writeFileSync(sidecarPath, JSON.stringify(metadata, null, 2));

  log.info({ backupPath, sizeBytes: stats.size, timestamp }, 'backup completed');

  return {
    backupPath,
    sidecarPath,
    sizeBytes: stats.size,
    timestamp,
    ddlHash,
  };
}
