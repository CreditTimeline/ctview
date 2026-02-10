import { describe, it, expect } from 'vitest';
import { createTestDb } from '../helpers/test-db.js';
import { createSeededDb, createTradelineSeededDb } from './query-test-helpers.js';
import {
  listTradelines,
  getTradelineDetail,
  getTradelineMetrics,
} from '../../queries/tradelines.js';

describe('listTradelines', () => {
  it('returns empty result on empty database', () => {
    const db = createTestDb();
    const result = listTradelines(db, { limit: 50, offset: 0 });

    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('returns tradelines after ingestion', async () => {
    const db = await createSeededDb();
    const result = listTradelines(db, { limit: 50, offset: 0 });

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.items[0].tradelineId).toBe('tl_halifax_mortgage_01');
    expect(result.items[0].accountType).toBe('mortgage');
    expect(result.items[0].furnisherName).toBe('Halifax');
    expect(result.items[0].sourceSystem).toBe('equifax');
  });

  it('includes latest snapshot data', async () => {
    const db = await createSeededDb();
    const result = listTradelines(db, { limit: 50, offset: 0 });

    expect(result.items[0].latestBalance).toBe(33251100);
    expect(result.items[0].latestSnapshotDate).toBe('2026-01-13');
  });

  it('filters by accountType', async () => {
    const db = await createSeededDb();

    const mortgages = listTradelines(db, {
      limit: 50,
      offset: 0,
      accountType: 'mortgage',
    });
    expect(mortgages.items).toHaveLength(1);

    const cards = listTradelines(db, {
      limit: 50,
      offset: 0,
      accountType: 'credit_card',
    });
    expect(cards.items).toHaveLength(0);
  });

  it('filters by sourceSystem', async () => {
    const db = await createSeededDb();

    const eqf = listTradelines(db, {
      limit: 50,
      offset: 0,
      sourceSystem: 'equifax',
    });
    expect(eqf.items).toHaveLength(1);

    const tu = listTradelines(db, {
      limit: 50,
      offset: 0,
      sourceSystem: 'transunion',
    });
    expect(tu.items).toHaveLength(0);
  });

  it('respects pagination', async () => {
    const db = await createSeededDb();

    const page1 = listTradelines(db, { limit: 1, offset: 0 });
    expect(page1.items).toHaveLength(1);

    const page2 = listTradelines(db, { limit: 1, offset: 1 });
    expect(page2.items).toHaveLength(0);
    expect(page2.total).toBe(1);
  });
});

describe('getTradelineDetail', () => {
  it('returns null for non-existent tradeline', () => {
    const db = createTestDb();
    const result = getTradelineDetail(db, 'nonexistent');
    expect(result).toBeNull();
  });

  it('returns full detail for existing tradeline (example file)', async () => {
    const db = await createSeededDb();
    const result = getTradelineDetail(db, 'tl_halifax_mortgage_01');

    expect(result).not.toBeNull();
    expect(result!.tradelineId).toBe('tl_halifax_mortgage_01');
    expect(result!.canonicalId).toBe('canon_halifax_mortgage_01');
    expect(result!.accountType).toBe('mortgage');
    expect(result!.furnisherName).toBe('Halifax');
    expect(result!.sourceSystem).toBe('equifax');
  });

  it('includes child entities', async () => {
    const db = await createTradelineSeededDb();
    const result = getTradelineDetail(db, 'tl_test_001')!;

    expect(result.identifiers).toHaveLength(1);
    expect(result.identifiers[0].identifierType).toBe('masked_account_number');
    expect(result.identifiers[0].value).toBe('XXXX1234');

    expect(result.parties).toHaveLength(1);
    expect(result.parties[0].partyRole).toBe('primary');

    expect(result.terms).toHaveLength(1);
    expect(result.terms[0].termType).toBe('revolving');

    expect(result.snapshots).toHaveLength(1);
    expect(result.snapshots[0].currentBalance).toBe(50000);

    expect(result.events).toHaveLength(1);
    expect(result.events[0].eventType).toBe('other');
  });

  it('snapshots are sorted by date DESC', async () => {
    const db = await createSeededDb();
    const result = getTradelineDetail(db, 'tl_halifax_mortgage_01')!;

    // Only 1 snapshot in example, but structure should be correct
    expect(result.snapshots).toHaveLength(1);
    expect(result.snapshots[0].asOfDate).toBe('2026-01-13');
  });
});

describe('getTradelineMetrics', () => {
  it('returns empty metrics for non-existent tradeline', () => {
    const db = createTestDb();
    const result = getTradelineMetrics(db, 'nonexistent');

    expect(result.tradelineId).toBe('nonexistent');
    expect(result.metrics).toHaveLength(0);
  });

  it('returns metrics for existing tradeline', async () => {
    const db = await createSeededDb();
    const result = getTradelineMetrics(db, 'tl_halifax_mortgage_01');

    expect(result.metrics.length).toBeGreaterThan(0);
    expect(result.metrics[0].period).toBe('2025-12');
  });

  it('filters by metricType', async () => {
    const db = await createSeededDb();

    const status = getTradelineMetrics(db, 'tl_halifax_mortgage_01', {
      limit: 50,
      offset: 0,
      metricType: 'payment_status',
    });
    expect(status.metrics.length).toBeGreaterThan(0);
    expect(status.metrics.every((m) => m.metricType === 'payment_status')).toBe(true);

    const balance = getTradelineMetrics(db, 'tl_halifax_mortgage_01', {
      limit: 50,
      offset: 0,
      metricType: 'balance',
    });
    expect(balance.metrics.length).toBeGreaterThan(0);
    expect(balance.metrics.every((m) => m.metricType === 'balance')).toBe(true);
  });

  it('orders metrics by period ASC', async () => {
    const db = await createSeededDb();
    const result = getTradelineMetrics(db, 'tl_halifax_mortgage_01');

    for (let i = 1; i < result.metrics.length; i++) {
      expect(result.metrics[i].period >= result.metrics[i - 1].period).toBe(true);
    }
  });
});
