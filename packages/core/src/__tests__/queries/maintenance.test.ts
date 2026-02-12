import { describe, it, expect } from 'vitest';
import { sql } from 'drizzle-orm';
import { createTestDb } from '../helpers/test-db.js';
import {
  getRetentionConfig,
  compactRawArtifacts,
  compactAuditLog,
  runCompaction,
} from '../../queries/maintenance.js';
import { updateAppSetting } from '../../queries/settings.js';

describe('getRetentionConfig', () => {
  it('returns default values when no settings exist', () => {
    const db = createTestDb();
    const config = getRetentionConfig(db);

    expect(config.rawArtifactDays).toBe(365);
    expect(config.auditLogDays).toBe(90);
  });

  it('reads custom values from app_settings', () => {
    const db = createTestDb();
    updateAppSetting(db, 'retention.raw_artifact_days', '180');
    updateAppSetting(db, 'retention.audit_log_days', '30');

    const config = getRetentionConfig(db);

    expect(config.rawArtifactDays).toBe(180);
    expect(config.auditLogDays).toBe(30);
  });

  it('uses defaults for invalid numeric values', () => {
    const db = createTestDb();
    updateAppSetting(db, 'retention.raw_artifact_days', 'not-a-number');

    const config = getRetentionConfig(db);

    expect(config.rawArtifactDays).toBe(365);
  });
});

describe('compactRawArtifacts', () => {
  it('NULLs out old artifact data', () => {
    const db = createTestDb();

    // Create prerequisite rows
    db.run(sql`INSERT INTO subject (subject_id, created_at) VALUES ('s1', datetime('now'))`);
    db.run(
      sql`INSERT INTO credit_file (file_id, schema_version, subject_id, created_at) VALUES ('f1', '1.0.0', 's1', datetime('now'))`,
    );
    // Insert an old import batch (400 days ago)
    db.run(
      sql`INSERT INTO import_batch (import_id, file_id, subject_id, imported_at, source_system, acquisition_method) VALUES ('imp_old', 'f1', 's1', datetime('now', '-400 days'), 'equifax', 'api')`,
    );
    // Insert a recent import batch
    db.run(
      sql`INSERT INTO import_batch (import_id, file_id, subject_id, imported_at, source_system, acquisition_method) VALUES ('imp_new', 'f1', 's1', datetime('now'), 'equifax', 'api')`,
    );
    // Insert old artifact with data
    db.run(
      sql`INSERT INTO raw_artifact (artifact_id, import_id, artifact_type, sha256, embedded_base64, extracted_text_ref) VALUES ('art_old', 'imp_old', 'pdf', 'sha_old', 'base64data', 'textref')`,
    );
    // Insert recent artifact with data
    db.run(
      sql`INSERT INTO raw_artifact (artifact_id, import_id, artifact_type, sha256, embedded_base64, extracted_text_ref) VALUES ('art_new', 'imp_new', 'pdf', 'sha_new', 'base64data', 'textref')`,
    );

    const compacted = compactRawArtifacts(db, 365);
    expect(compacted).toBe(1);

    // Verify old artifact was compacted
    const oldArt = db.all<{ embedded_base64: string | null; extracted_text_ref: string | null }>(
      sql`SELECT embedded_base64, extracted_text_ref FROM raw_artifact WHERE artifact_id = 'art_old'`,
    );
    expect(oldArt[0].embedded_base64).toBeNull();
    expect(oldArt[0].extracted_text_ref).toBeNull();

    // Verify recent artifact was NOT compacted
    const newArt = db.all<{ embedded_base64: string | null; extracted_text_ref: string | null }>(
      sql`SELECT embedded_base64, extracted_text_ref FROM raw_artifact WHERE artifact_id = 'art_new'`,
    );
    expect(newArt[0].embedded_base64).toBe('base64data');
    expect(newArt[0].extracted_text_ref).toBe('textref');
  });

  it('returns 0 when no artifacts match', () => {
    const db = createTestDb();
    const compacted = compactRawArtifacts(db, 365);
    expect(compacted).toBe(0);
  });
});

describe('compactAuditLog', () => {
  it('deletes old audit entries', () => {
    const db = createTestDb();

    // Insert old audit entry (100 days ago)
    db.run(
      sql`INSERT INTO audit_log (log_id, event_type, created_at) VALUES ('log_old', 'ingest', datetime('now', '-100 days'))`,
    );
    // Insert recent audit entry
    db.run(
      sql`INSERT INTO audit_log (log_id, event_type, created_at) VALUES ('log_new', 'ingest', datetime('now'))`,
    );

    const deleted = compactAuditLog(db, 90);
    expect(deleted).toBe(1);

    // Verify old entry was deleted
    const remaining = db.all<{ log_id: string }>(sql`SELECT log_id FROM audit_log`);
    expect(remaining.length).toBe(1);
    expect(remaining[0].log_id).toBe('log_new');
  });

  it('returns 0 when no entries match', () => {
    const db = createTestDb();
    const deleted = compactAuditLog(db, 90);
    expect(deleted).toBe(0);
  });
});

describe('runCompaction', () => {
  it('runs full compaction and stores last compaction time', () => {
    const db = createTestDb();

    // Insert old audit entry
    db.run(
      sql`INSERT INTO audit_log (log_id, event_type, created_at) VALUES ('log_old', 'ingest', datetime('now', '-100 days'))`,
    );

    const result = runCompaction(db);

    expect(result.artifactsCompacted).toBe(0);
    expect(result.auditEntriesDeleted).toBe(1);
    expect(result.executedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    // Verify last_compaction_at was stored
    const rows = db.all<{ value: string }>(
      sql`SELECT value FROM app_settings WHERE key = 'last_compaction_at'`,
    );
    expect(rows.length).toBe(1);
    expect(rows[0].value).toBe(result.executedAt);
  });

  it('uses configured retention days', () => {
    const db = createTestDb();
    updateAppSetting(db, 'retention.audit_log_days', '50');

    // Insert entry 60 days ago (should be deleted with 50-day retention)
    db.run(
      sql`INSERT INTO audit_log (log_id, event_type, created_at) VALUES ('log_mid', 'ingest', datetime('now', '-60 days'))`,
    );

    const result = runCompaction(db);
    expect(result.auditEntriesDeleted).toBe(1);
  });
});
