import { describe, it, expect } from 'vitest';
import { createTestDb } from '../helpers/test-db.js';
import { buildCreditFileWithSearches } from './query-test-helpers.js';
import { ingestCreditFile } from '../../ingestion/ingest-file.js';
import { listSearches, getSearchTimeline, getSearchFrequency } from '../../queries/searches.js';

async function createSearchSeededDb() {
  const db = createTestDb();
  const data = buildCreditFileWithSearches();
  const result = await ingestCreditFile(db, data);
  if (!result.success) throw new Error(`Seed failed: ${result.errors?.join(', ')}`);
  return db;
}

describe('listSearches', () => {
  it('returns empty result on empty database', () => {
    const db = createTestDb();
    const result = listSearches(db, { limit: 50, offset: 0 });

    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('returns searches after ingestion', async () => {
    const db = await createSearchSeededDb();
    const result = listSearches(db, { limit: 50, offset: 0 });

    expect(result.items).toHaveLength(3);
    expect(result.total).toBe(3);
  });

  it('searches are ordered by date DESC', async () => {
    const db = await createSearchSeededDb();
    const result = listSearches(db, { limit: 50, offset: 0 });

    // Most recent first
    expect(result.items[0].searchedAt).toBe('2026-02-01');
    expect(result.items[2].searchedAt).toBe('2026-01-15');
  });

  it('filters by visibility', async () => {
    const db = await createSearchSeededDb();

    const hard = listSearches(db, { limit: 50, offset: 0, visibility: 'hard' });
    expect(hard.items).toHaveLength(1);
    expect(hard.total).toBe(1);

    const soft = listSearches(db, { limit: 50, offset: 0, visibility: 'soft' });
    expect(soft.items).toHaveLength(2);
    expect(soft.total).toBe(2);
  });

  it('filters by searchType', async () => {
    const db = await createSearchSeededDb();

    const result = listSearches(db, {
      limit: 50,
      offset: 0,
      searchType: 'credit_application',
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].searchId).toBe('sr_test_001');
  });

  it('filters by date range', async () => {
    const db = await createSearchSeededDb();

    const result = listSearches(db, {
      limit: 50,
      offset: 0,
      from: '2026-01-20',
      to: '2026-01-31',
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].searchId).toBe('sr_test_002');
  });

  it('resolves organisation name', async () => {
    const db = await createSearchSeededDb();
    const result = listSearches(db, { limit: 50, offset: 0 });

    const withOrg = result.items.find((s) => s.searchId === 'sr_test_001');
    expect(withOrg!.organisationName).toBe('Bank Search Ltd');

    const withoutOrg = result.items.find((s) => s.searchId === 'sr_test_003');
    expect(withoutOrg!.organisationName).toBe('Unknown Org');
  });

  it('respects pagination', async () => {
    const db = await createSearchSeededDb();

    const page = listSearches(db, { limit: 2, offset: 0 });
    expect(page.items).toHaveLength(2);
    expect(page.total).toBe(3);
  });
});

describe('getSearchTimeline', () => {
  it('returns empty on no searches', () => {
    const db = createTestDb();
    const result = getSearchTimeline(db, 'subj_test_001');

    expect(result.hardSearches).toHaveLength(0);
    expect(result.softSearches).toHaveLength(0);
  });

  it('groups searches by month and visibility', async () => {
    const db = await createSearchSeededDb();
    const result = getSearchTimeline(db, 'subj_test_001');

    // January: 1 hard, 1 soft; February: 1 soft
    expect(result.hardSearches).toHaveLength(1);
    expect(result.hardSearches[0].month).toBe('2026-01');
    expect(result.hardSearches[0].count).toBe(1);

    expect(result.softSearches).toHaveLength(2);
  });
});

describe('getSearchFrequency', () => {
  it('returns empty on no searches', () => {
    const db = createTestDb();
    const result = getSearchFrequency(db, 'subj_test_001');

    expect(result.items).toHaveLength(0);
  });

  it('groups by organisation and type', async () => {
    const db = await createSearchSeededDb();
    const result = getSearchFrequency(db, 'subj_test_001');

    expect(result.items.length).toBeGreaterThan(0);
    // Should have entries for each org+type combination
    const bankSearch = result.items.find((i) => i.organisationName === 'Bank Search Ltd');
    expect(bankSearch).toBeDefined();
  });
});
