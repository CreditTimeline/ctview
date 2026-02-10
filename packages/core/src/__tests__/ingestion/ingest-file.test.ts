import { describe, it, expect } from 'vitest';
import { sql } from 'drizzle-orm';
import { createTestDb } from '../helpers/test-db.js';
import {
  loadExampleCreditFile,
  buildMinimalCreditFile,
  buildCreditFileWithTradeline,
} from '../helpers/fixtures.js';
import { ingestCreditFile } from '../../ingestion/ingest-file.js';

function rowCount(db: ReturnType<typeof createTestDb>, table: string): number {
  const result = db.get<{ count: number }>(sql.raw(`SELECT COUNT(*) as count FROM ${table}`));
  return result?.count ?? 0;
}

describe('ingestCreditFile', () => {
  it('successfully ingests the full example payload', async () => {
    const db = createTestDb();
    const data = loadExampleCreditFile();

    const result = await ingestCreditFile(db, data);

    expect(result.success).toBe(true);
    expect(result.errors).toBeUndefined();
    expect(result.duplicate).toBeUndefined();
    expect(result.importIds).toEqual(['imp_2026_02_07_eqf']);
    expect(result.receiptId).toBeDefined();
    expect(result.durationMs).toBeGreaterThanOrEqual(0);

    // Verify summary entity counts
    expect(result.summary).toBeDefined();
    expect(result.summary!.subjects).toBe(1);
    expect(result.summary!.credit_files).toBe(1);
    expect(result.summary!.import_batches).toBe(1);
    expect(result.summary!.raw_artifacts).toBe(1);

    // Verify actual row counts in DB
    expect(rowCount(db, 'subject')).toBe(1);
    expect(rowCount(db, 'credit_file')).toBe(1);
    expect(rowCount(db, 'import_batch')).toBe(1);
    expect(rowCount(db, 'raw_artifact')).toBe(1);
    expect(rowCount(db, 'person_name')).toBe(2);
    expect(rowCount(db, 'subject_identifier')).toBe(1);
    expect(rowCount(db, 'address')).toBe(2);
    expect(rowCount(db, 'address_association')).toBe(2);
    expect(rowCount(db, 'organisation')).toBe(2);
    expect(rowCount(db, 'tradeline')).toBe(1);
    expect(rowCount(db, 'tradeline_identifier')).toBe(1);
    expect(rowCount(db, 'tradeline_terms')).toBe(1);
    expect(rowCount(db, 'tradeline_snapshot')).toBe(1);
    expect(rowCount(db, 'tradeline_monthly_metric')).toBe(2);
    expect(rowCount(db, 'search_record')).toBe(1);
    expect(rowCount(db, 'credit_score')).toBe(1);
    expect(rowCount(db, 'property_record')).toBe(1);
    expect(rowCount(db, 'financial_associate')).toBe(1);
    expect(rowCount(db, 'electoral_roll_entry')).toBe(1);
    expect(rowCount(db, 'attributable_item')).toBe(1);
    expect(rowCount(db, 'dispute')).toBe(1);
    expect(rowCount(db, 'ingest_receipt')).toBe(1);
    expect(rowCount(db, 'audit_log')).toBe(1);
  });

  it('returns duplicate=true for idempotent re-ingest', async () => {
    const db = createTestDb();
    const data = loadExampleCreditFile();

    const first = await ingestCreditFile(db, data);
    expect(first.success).toBe(true);
    expect(first.duplicate).toBeUndefined();

    const second = await ingestCreditFile(db, data);
    expect(second.success).toBe(true);
    expect(second.duplicate).toBe(true);

    // Row counts should not increase
    expect(rowCount(db, 'subject')).toBe(1);
    expect(rowCount(db, 'tradeline')).toBe(1);
    expect(rowCount(db, 'ingest_receipt')).toBe(1);
  });

  it('rejects invalid JSON with schema errors', async () => {
    const db = createTestDb();

    const result = await ingestCreditFile(db, { bad: 'data' });

    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThan(0);

    // No rows should be inserted
    expect(rowCount(db, 'subject')).toBe(0);
    expect(rowCount(db, 'credit_file')).toBe(0);
  });

  it('rejects broken referential integrity', async () => {
    const db = createTestDb();
    const data = buildMinimalCreditFile({
      address_associations: [
        {
          association_id: 'assoc_bad',
          address_id: 'addr_nonexistent',
          role: 'current',
          source_import_id: 'imp_test_001',
        },
      ],
    } as Partial<Record<string, unknown>>);

    const result = await ingestCreditFile(db, data);

    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.some((e) => e.includes('addr_nonexistent'))).toBe(true);

    // No rows should be inserted
    expect(rowCount(db, 'subject')).toBe(0);
  });

  it('rolls back transaction on failure (duplicate PK)', async () => {
    const db = createTestDb();
    const data = buildMinimalCreditFile();

    // First ingest succeeds
    const first = await ingestCreditFile(db, data);
    expect(first.success).toBe(true);

    // Modify the payload slightly so SHA-256 hash differs (not a duplicate),
    // but keep the same IDs so inserts will conflict
    const modified = buildMinimalCreditFile({
      extensions: { force_new_hash: true },
    } as Partial<Record<string, unknown>>);

    // Should throw due to duplicate PK on subject table
    await expect(ingestCreditFile(db, modified)).rejects.toThrow();

    // Original data should still be intact — no partial modifications
    expect(rowCount(db, 'subject')).toBe(1);
    expect(rowCount(db, 'ingest_receipt')).toBe(1);
  });

  it('generates and stores quality warnings', async () => {
    const db = createTestDb();
    // A credit file with a tradeline that has no snapshots or metrics
    const data = buildMinimalCreditFile({
      organisations: [
        {
          organisation_id: 'org_w',
          name: 'Warn Bank',
          source_import_id: 'imp_test_001',
        },
      ],
      tradelines: [
        {
          tradeline_id: 'tl_warn_001',
          furnisher_organisation_id: 'org_w',
          account_type: 'credit_card',
          status_current: 'active',
          source_import_id: 'imp_test_001',
          // No snapshots, no monthly_metrics → triggers warnings
        },
      ],
    } as Partial<Record<string, unknown>>);

    const result = await ingestCreditFile(db, data);

    expect(result.success).toBe(true);
    expect(result.warnings).toBeDefined();
    expect(result.warnings!.length).toBeGreaterThan(0);

    // Should have missing_snapshots and missing_metrics warnings
    const kinds = result.warnings!.map((w) => w.kind);
    expect(kinds).toContain('missing_snapshots');
    expect(kinds).toContain('missing_metrics');

    // Warnings should be stored as generated_insight rows
    expect(rowCount(db, 'generated_insight')).toBeGreaterThan(0);
  });

  it('tracks entity counts in ingest_receipt', async () => {
    const db = createTestDb();
    const data = loadExampleCreditFile();

    const result = await ingestCreditFile(db, data);
    expect(result.success).toBe(true);

    // Check that ingest_receipt has entity_counts_json
    const receipt = db.get<{ entity_counts_json: string }>(
      sql.raw(`SELECT entity_counts_json FROM ingest_receipt LIMIT 1`),
    );
    expect(receipt).toBeDefined();
    const counts = JSON.parse(receipt!.entity_counts_json);
    expect(counts.tradelines).toBe(1);
    expect(counts.subjects).toBe(1);
    expect(counts.credit_files).toBe(1);
  });

  it('ingests a payload with tradeline child entities', async () => {
    const db = createTestDb();
    const data = buildCreditFileWithTradeline();

    const result = await ingestCreditFile(db, data);

    expect(result.success).toBe(true);
    expect(result.summary!.tradelines).toBe(1);
    expect(result.summary!.tradeline_identifiers).toBe(1);
    expect(result.summary!.tradeline_parties).toBe(1);
    expect(result.summary!.tradeline_terms).toBe(1);
    expect(result.summary!.tradeline_snapshots).toBe(1);
    expect(result.summary!.tradeline_monthly_metrics).toBe(1);
    expect(result.summary!.tradeline_events).toBe(1);

    // Verify DB rows
    expect(rowCount(db, 'tradeline')).toBe(1);
    expect(rowCount(db, 'tradeline_identifier')).toBe(1);
    expect(rowCount(db, 'tradeline_party')).toBe(1);
    expect(rowCount(db, 'tradeline_terms')).toBe(1);
    expect(rowCount(db, 'tradeline_snapshot')).toBe(1);
    expect(rowCount(db, 'tradeline_monthly_metric')).toBe(1);
    expect(rowCount(db, 'tradeline_event')).toBe(1);
  });
});
