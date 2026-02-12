import { sql, eq } from 'drizzle-orm';
import type { AppDatabase } from '../db/client.js';
import { appSettings } from '../schema/sqlite/app.js';

export interface RetentionConfig {
  rawArtifactDays: number;
  auditLogDays: number;
}

export interface CompactResult {
  artifactsCompacted: number;
  auditEntriesDeleted: number;
  executedAt: string;
}

const DEFAULT_RAW_ARTIFACT_DAYS = 365;
const DEFAULT_AUDIT_LOG_DAYS = 90;

/** Read retention config from app_settings, with defaults. */
export function getRetentionConfig(db: AppDatabase): RetentionConfig {
  const rows = db
    .select()
    .from(appSettings)
    .where(
      sql`${appSettings.key} IN ('retention.raw_artifact_days', 'retention.audit_log_days')`,
    )
    .all();

  let rawArtifactDays = DEFAULT_RAW_ARTIFACT_DAYS;
  let auditLogDays = DEFAULT_AUDIT_LOG_DAYS;

  for (const row of rows) {
    const parsed = parseInt(row.value, 10);
    if (isNaN(parsed) || parsed < 0) continue;
    if (row.key === 'retention.raw_artifact_days') rawArtifactDays = parsed;
    if (row.key === 'retention.audit_log_days') auditLogDays = parsed;
  }

  return { rawArtifactDays, auditLogDays };
}

/**
 * NULL out embedded_base64 and extracted_text_ref on old raw_artifact rows.
 * "Old" is determined by the imported_at date of the parent import_batch.
 */
export function compactRawArtifacts(db: AppDatabase, olderThanDays: number): number {
  const result = db.run(
    sql`UPDATE raw_artifact
        SET embedded_base64 = NULL, extracted_text_ref = NULL
        WHERE (embedded_base64 IS NOT NULL OR extracted_text_ref IS NOT NULL)
          AND import_id IN (
            SELECT import_id FROM import_batch
            WHERE imported_at < datetime('now', ${`-${olderThanDays} days`})
          )`,
  );
  return result.changes;
}

/** DELETE old audit_log entries. */
export function compactAuditLog(db: AppDatabase, olderThanDays: number): number {
  const result = db.run(
    sql`DELETE FROM audit_log
        WHERE created_at < datetime('now', ${`-${olderThanDays} days`})`,
  );
  return result.changes;
}

/** Run full compaction using configured retention values. */
export function runCompaction(db: AppDatabase): CompactResult {
  const config = getRetentionConfig(db);
  const artifactsCompacted = compactRawArtifacts(db, config.rawArtifactDays);
  const auditEntriesDeleted = compactAuditLog(db, config.auditLogDays);
  const executedAt = new Date().toISOString();

  // Store last compaction time
  const now = new Date().toISOString();
  db.insert(appSettings)
    .values({ key: 'last_compaction_at', value: executedAt, updated_at: now })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value: executedAt, updated_at: now },
    })
    .run();

  return { artifactsCompacted, auditEntriesDeleted, executedAt };
}
