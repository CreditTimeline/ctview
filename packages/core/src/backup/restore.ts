import { existsSync, copyFileSync, unlinkSync } from 'fs';
import Database from 'better-sqlite3';
import { noopLogger, type Logger } from '../logger.js';

export interface RestoreValidation {
  valid: boolean;
  errors: string[];
  backupDdlHash: string | null;
  currentDdlHash: string | null;
}

/**
 * Validate a backup file before restoring.
 * Checks: file exists, is valid SQLite, DDL hash matches current schema.
 */
export function validateBackup(
  backupPath: string,
  currentDdlHash: string | null,
): RestoreValidation {
  const errors: string[] = [];
  let backupDdlHash: string | null = null;

  if (!existsSync(backupPath)) {
    errors.push(`Backup file not found: ${backupPath}`);
    return { valid: false, errors, backupDdlHash, currentDdlHash };
  }

  try {
    const db = new Database(backupPath, { readonly: true });
    try {
      const row = db
        .prepare("SELECT value FROM app_settings WHERE key = 'ddl_hash'")
        .get() as { value: string } | undefined;
      backupDdlHash = row?.value ?? null;
    } catch {
      errors.push('Backup database does not contain app_settings table');
    }
    db.close();
  } catch {
    errors.push('Backup file is not a valid SQLite database');
    return { valid: false, errors, backupDdlHash, currentDdlHash };
  }

  if (currentDdlHash && backupDdlHash && backupDdlHash !== currentDdlHash) {
    errors.push(
      `DDL hash mismatch: backup has ${backupDdlHash}, current schema is ${currentDdlHash}`,
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    backupDdlHash,
    currentDdlHash,
  };
}

/**
 * Restore a backup by copying it over the target database.
 * IMPORTANT: Caller must close the current DB connection first (resetDb()).
 */
export function restoreBackup(backupPath: string, targetPath: string, logger?: Logger): void {
  const log = logger ?? noopLogger;
  if (!existsSync(backupPath)) {
    throw new Error(`Backup file not found: ${backupPath}`);
  }
  log.info({ backupPath, targetPath }, 'restoring backup');
  copyFileSync(backupPath, targetPath);

  // Remove WAL/SHM files from the target if they exist
  for (const suffix of ['-wal', '-shm']) {
    try {
      unlinkSync(targetPath + suffix);
    } catch {
      // Ignore if they don't exist
    }
  }
  log.info('backup restored successfully');
}
