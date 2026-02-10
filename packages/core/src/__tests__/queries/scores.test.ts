import { describe, it, expect } from 'vitest';
import { createTestDb } from '../helpers/test-db.js';
import { buildCreditFileWithScores } from './query-test-helpers.js';
import { ingestCreditFile } from '../../ingestion/ingest-file.js';
import { listScores, getScoreTrend } from '../../queries/scores.js';

async function createScoreSeededDb() {
  const db = createTestDb();
  const data = buildCreditFileWithScores();
  const result = await ingestCreditFile(db, data);
  if (!result.success) throw new Error(`Seed failed: ${result.errors?.join(', ')}`);
  return db;
}

describe('listScores', () => {
  it('returns empty result on empty database', () => {
    const db = createTestDb();
    const result = listScores(db, { limit: 50, offset: 0 });

    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('returns scores after ingestion', async () => {
    const db = await createScoreSeededDb();
    const result = listScores(db, { limit: 50, offset: 0 });

    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(2);
  });

  it('scores are ordered by date DESC', async () => {
    const db = await createScoreSeededDb();
    const result = listScores(db, { limit: 50, offset: 0 });

    expect(result.items[0].calculatedAt).toBe('2026-02-01');
    expect(result.items[1].calculatedAt).toBe('2026-01-01');
  });

  it('parses score factors from JSON', async () => {
    const db = await createScoreSeededDb();
    const result = listScores(db, { limit: 50, offset: 0 });

    expect(result.items[0].scoreFactors).toBeInstanceOf(Array);
    expect(result.items[0].scoreFactors.length).toBeGreaterThan(0);
  });

  it('filters by sourceSystem', async () => {
    const db = await createScoreSeededDb();

    const eqf = listScores(db, { limit: 50, offset: 0, sourceSystem: 'equifax' });
    expect(eqf.items).toHaveLength(2);

    const tu = listScores(db, { limit: 50, offset: 0, sourceSystem: 'transunion' });
    expect(tu.items).toHaveLength(0);
  });

  it('filters by date range', async () => {
    const db = await createScoreSeededDb();

    const result = listScores(db, {
      limit: 50,
      offset: 0,
      from: '2026-01-15',
      to: '2026-03-01',
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].scoreValue).toBe(740);
  });

  it('includes score band and range', async () => {
    const db = await createScoreSeededDb();
    const result = listScores(db, { limit: 50, offset: 0 });

    expect(result.items[0].scoreBand).toBe('Good');
    expect(result.items[0].scoreMin).toBe(0);
    expect(result.items[0].scoreMax).toBe(1000);
  });

  it('respects pagination', async () => {
    const db = await createScoreSeededDb();

    const page = listScores(db, { limit: 1, offset: 0 });
    expect(page.items).toHaveLength(1);
    expect(page.total).toBe(2);
  });
});

describe('getScoreTrend', () => {
  it('returns empty series on empty database', () => {
    const db = createTestDb();
    const result = getScoreTrend(db, 'subj_test_001');

    expect(Object.keys(result.series)).toHaveLength(0);
  });

  it('groups scores by source system', async () => {
    const db = await createScoreSeededDb();
    const result = getScoreTrend(db, 'subj_test_001');

    expect(result.series).toHaveProperty('equifax');
    expect(result.series.equifax).toHaveLength(2);
  });

  it('orders by calculated_at ASC', async () => {
    const db = await createScoreSeededDb();
    const result = getScoreTrend(db, 'subj_test_001');

    const eqf = result.series.equifax;
    expect(eqf[0].calculatedAt).toBe('2026-01-01');
    expect(eqf[1].calculatedAt).toBe('2026-02-01');
  });
});
