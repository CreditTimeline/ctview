import { sql, eq } from 'drizzle-orm';
import type { AppDatabase } from '../db/client.js';
import { appSettings } from '../schema/sqlite/app.js';
import type { SystemHealth, AppSettingEntry } from './types.js';

export function getSystemHealth(db: AppDatabase): SystemHealth {
  const count = (table: string) =>
    (db.all<{ count: number }>(sql.raw(`SELECT COUNT(*) as count FROM ${table}`))[0]?.count ?? 0);

  const tableCounts: Record<string, number> = {
    reports: count('credit_file'),
    tradelines: count('tradeline'),
    searches: count('search_record'),
    scores: count('credit_score'),
    imports: count('import_batch'),
    addresses: count('address'),
    publicRecords: count('public_record'),
  };

  const lastIngestRow = db.all<{ ingested_at: string }>(sql`
    SELECT ingested_at FROM ingest_receipt ORDER BY ingested_at DESC LIMIT 1
  `);
  const lastIngestAt = lastIngestRow[0]?.ingested_at ?? null;

  const ddlRow = db
    .select({ value: appSettings.value })
    .from(appSettings)
    .where(eq(appSettings.key, 'ddl_hash'))
    .get();
  const schemaVersion = ddlRow?.value ?? null;

  return {
    tableCounts,
    lastIngestAt,
    dbEngine: 'sqlite',
    schemaVersion,
  };
}

export function getAppSettings(db: AppDatabase): AppSettingEntry[] {
  const rows = db
    .select()
    .from(appSettings)
    .orderBy(appSettings.key)
    .all();

  return rows.map((r) => ({
    key: r.key,
    value: r.value,
    updatedAt: r.updated_at,
  }));
}

export function updateAppSetting(
  db: AppDatabase,
  key: string,
  value: string,
): AppSettingEntry {
  const now = new Date().toISOString();

  db.insert(appSettings)
    .values({ key, value, updated_at: now })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value, updated_at: now },
    })
    .run();

  return { key, value, updatedAt: now };
}
