import { readdirSync, readFileSync, statSync, existsSync } from 'fs';
import { resolve } from 'path';
import type { BackupMetadata } from './backup.js';

/**
 * List all backups in the backup directory, sorted by timestamp descending.
 */
export function listBackups(backupDir: string): BackupMetadata[] {
  if (!existsSync(backupDir)) {
    return [];
  }

  const files = readdirSync(backupDir).filter(
    (f) => f.startsWith('ctview-backup-') && f.endsWith('.db'),
  );

  const backups: BackupMetadata[] = [];

  for (const dbFile of files) {
    const sidecarFile = dbFile.replace(/\.db$/, '.json');
    const sidecarPath = resolve(backupDir, sidecarFile);
    const dbPath = resolve(backupDir, dbFile);

    if (existsSync(sidecarPath)) {
      try {
        const raw = readFileSync(sidecarPath, 'utf-8');
        const metadata: BackupMetadata = JSON.parse(raw);
        backups.push(metadata);
        continue;
      } catch {
        // Fall through to build metadata from file info
      }
    }

    // Build metadata from the file itself if sidecar is missing/invalid
    const stats = statSync(dbPath);
    const match = dbFile.match(/^ctview-backup-(.+)\.db$/);
    const timestamp = match ? match[1] : 'unknown';

    backups.push({
      backupFile: dbFile,
      timestamp,
      sizeBytes: stats.size,
      ddlHash: null,
    });
  }

  // Sort by timestamp descending (newest first)
  backups.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return backups;
}
