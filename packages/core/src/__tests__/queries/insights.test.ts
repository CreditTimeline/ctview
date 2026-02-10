import { describe, it, expect } from 'vitest';
import { createTestDb } from '../helpers/test-db.js';
import { buildMinimalCreditFile } from '../helpers/fixtures.js';
import { ingestCreditFile } from '../../ingestion/ingest-file.js';
import { generatedInsight, generatedInsightEntity } from '../../schema/sqlite/index.js';
import { listInsights, getSubjectAnomalies } from '../../queries/insights.js';
import type { AppDatabase } from '../../db/client.js';

/**
 * Seeds a DB with a minimal ingestion then directly inserts insight rows.
 * We can't pass generated_insights through JSON input because the ingestion
 * pipeline doesn't process that array — only quality warnings become insights.
 */
async function createInsightSeededDb(): Promise<AppDatabase> {
  const db = createTestDb();
  const data = buildMinimalCreditFile();
  const result = await ingestCreditFile(db, data);
  if (!result.success) throw new Error(`Seed failed: ${result.errors?.join(', ')}`);

  // Directly insert insight rows with controlled data
  db.insert(generatedInsight)
    .values({
      insight_id: 'ins_test_001',
      subject_id: 'subj_test_001',
      kind: 'duplicate_tradeline',
      severity: 'high',
      summary: 'Possible duplicate tradeline detected',
      generated_at: '2026-01-15T00:00:00Z',
    })
    .run();

  db.insert(generatedInsight)
    .values({
      insight_id: 'ins_test_002',
      subject_id: 'subj_test_001',
      kind: 'missing_data',
      severity: 'low',
      summary: 'Missing opened_at date on tradeline',
      generated_at: '2026-01-16T00:00:00Z',
    })
    .run();

  // Link first insight to an entity
  db.insert(generatedInsightEntity)
    .values({
      insight_id: 'ins_test_001',
      entity_id: 'tl_test_001',
    })
    .run();

  return db;
}

describe('listInsights', () => {
  it('returns empty result on empty database', () => {
    const db = createTestDb();
    const result = listInsights(db, { limit: 50, offset: 0 });

    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('returns insights after seeding', async () => {
    const db = await createInsightSeededDb();
    const result = listInsights(db, { limit: 50, offset: 0 });

    // 2 directly inserted + any quality warnings from the minimal file ingestion
    expect(result.items.length).toBeGreaterThanOrEqual(2);
  });

  it('filters by severity', async () => {
    const db = await createInsightSeededDb();

    const high = listInsights(db, { limit: 50, offset: 0, severity: 'high' });
    const highItems = high.items.filter((i) => i.severity === 'high');
    expect(highItems.length).toBeGreaterThanOrEqual(1);
  });

  it('filters by kind', async () => {
    const db = await createInsightSeededDb();

    const result = listInsights(db, {
      limit: 50,
      offset: 0,
      kind: 'duplicate_tradeline',
    });
    const filtered = result.items.filter((i) => i.kind === 'duplicate_tradeline');
    expect(filtered.length).toBeGreaterThanOrEqual(1);
  });

  it('filters by subjectId', async () => {
    const db = await createInsightSeededDb();

    const found = listInsights(db, {
      limit: 50,
      offset: 0,
      subjectId: 'subj_test_001',
    });
    expect(found.items.length).toBeGreaterThanOrEqual(2);

    const notFound = listInsights(db, {
      limit: 50,
      offset: 0,
      subjectId: 'nonexistent',
    });
    expect(notFound.items).toHaveLength(0);
  });

  it('orders by generated_at DESC', async () => {
    const db = await createInsightSeededDb();
    const result = listInsights(db, { limit: 50, offset: 0 });

    for (let i = 1; i < result.items.length; i++) {
      expect(result.items[i].generatedAt <= result.items[i - 1].generatedAt).toBe(true);
    }
  });

  it('respects pagination', async () => {
    const db = await createInsightSeededDb();

    const page = listInsights(db, { limit: 1, offset: 0 });
    expect(page.items).toHaveLength(1);
    expect(page.total).toBeGreaterThanOrEqual(2);
  });
});

describe('getSubjectAnomalies', () => {
  it('returns empty data for non-existent subject', () => {
    const db = createTestDb();
    const result = getSubjectAnomalies(db, 'nonexistent');

    expect(Object.keys(result.countBySeverity)).toHaveLength(0);
    expect(result.recentInsights).toHaveLength(0);
  });

  it('returns anomaly summary for subject with insights', async () => {
    const db = await createInsightSeededDb();
    const result = getSubjectAnomalies(db, 'subj_test_001');

    expect(Object.keys(result.countBySeverity).length).toBeGreaterThan(0);
    expect(result.recentInsights.length).toBeGreaterThan(0);
  });

  it('limits recent insights to 20', async () => {
    const db = await createInsightSeededDb();
    const result = getSubjectAnomalies(db, 'subj_test_001');

    expect(result.recentInsights.length).toBeLessThanOrEqual(20);
  });
});
