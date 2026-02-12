import { describe, it, expect } from 'vitest';
import { createTestDb } from '../helpers/test-db.js';
import { buildCreditFileWithPublicRecords } from './query-test-helpers.js';
import { ingestCreditFile } from '../../ingestion/ingest-file.js';
import { listPublicRecords } from '../../queries/public-records.js';

async function createPublicRecordSeededDb() {
  const db = createTestDb();
  const data = buildCreditFileWithPublicRecords();
  const result = await ingestCreditFile(db, data);
  if (!result.success) throw new Error(`Seed failed: ${result.errors?.join(', ')}`);
  return db;
}

describe('listPublicRecords', () => {
  it('returns empty result on empty database', () => {
    const db = createTestDb();
    const result = listPublicRecords(db, { limit: 50, offset: 0 });

    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('returns public records after ingestion', async () => {
    const db = await createPublicRecordSeededDb();
    const result = listPublicRecords(db, { limit: 50, offset: 0 });

    expect(result.items).toHaveLength(3);
    expect(result.total).toBe(3);
  });

  it('records are ordered by recorded_at DESC', async () => {
    const db = await createPublicRecordSeededDb();
    const result = listPublicRecords(db, { limit: 50, offset: 0 });

    expect(result.items[0].recordedAt).toBe('2025-03-01');
    expect(result.items[2].recordedAt).toBe('2023-01-10');
  });

  it('includes all fields', async () => {
    const db = await createPublicRecordSeededDb();
    const result = listPublicRecords(db, { limit: 50, offset: 0 });

    const ccj = result.items.find((r) => r.publicRecordId === 'pr_test_001');
    expect(ccj).toBeDefined();
    expect(ccj!.recordType).toBe('ccj');
    expect(ccj!.courtOrRegister).toBe('Northampton County Court');
    expect(ccj!.amount).toBe(250000);
    expect(ccj!.status).toBe('active');
    expect(ccj!.satisfiedAt).toBeNull();
    expect(ccj!.sourceSystem).toBe('equifax');
  });

  it('includes satisfied records', async () => {
    const db = await createPublicRecordSeededDb();
    const result = listPublicRecords(db, { limit: 50, offset: 0 });

    const bankruptcy = result.items.find((r) => r.publicRecordId === 'pr_test_002');
    expect(bankruptcy!.satisfiedAt).toBe('2024-01-10');
    expect(bankruptcy!.status).toBe('discharged');
  });

  it('filters by subjectId', async () => {
    const db = await createPublicRecordSeededDb();

    const found = listPublicRecords(db, { limit: 50, offset: 0, subjectId: 'subj_test_001' });
    expect(found.items).toHaveLength(3);

    const notFound = listPublicRecords(db, { limit: 50, offset: 0, subjectId: 'nonexistent' });
    expect(notFound.items).toHaveLength(0);
  });

  it('respects pagination', async () => {
    const db = await createPublicRecordSeededDb();

    const page = listPublicRecords(db, { limit: 2, offset: 0 });
    expect(page.items).toHaveLength(2);
    expect(page.total).toBe(3);
  });
});
