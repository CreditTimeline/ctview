import { describe, it, expect } from 'vitest';
import { createTestDb } from '../helpers/test-db.js';
import { createSeededDb } from './query-test-helpers.js';
import { getDashboard } from '../../queries/dashboard.js';

describe('getDashboard', () => {
  it('returns zero counts on empty database', () => {
    const db = createTestDb();
    const result = getDashboard(db);

    expect(result.counts.tradelines).toBe(0);
    expect(result.counts.imports).toBe(0);
    expect(result.counts.searches).toBe(0);
    expect(result.counts.scores).toBe(0);
    expect(result.counts.publicRecords).toBe(0);
    expect(result.counts.addresses).toBe(0);
    expect(result.counts.fraudMarkers).toBe(0);
    expect(result.counts.disputes).toBe(0);
    expect(result.counts.insights).toBe(0);
    expect(result.latestScores).toHaveLength(0);
    expect(result.debtSummary.totalBalance).toBe(0);
    expect(result.debtSummary.openTradelineCount).toBe(0);
    expect(result.recentImports).toHaveLength(0);
  });

  it('returns populated data after ingesting example file', async () => {
    const db = await createSeededDb();
    const result = getDashboard(db);

    expect(result.counts.tradelines).toBe(1);
    expect(result.counts.imports).toBe(1);
    expect(result.counts.searches).toBe(1);
    expect(result.counts.scores).toBe(1);
    expect(result.counts.addresses).toBe(2);
    expect(result.counts.disputes).toBe(1);
  });

  it('returns latest scores per agency', async () => {
    const db = await createSeededDb();
    const result = getDashboard(db);

    expect(result.latestScores).toHaveLength(1);
    expect(result.latestScores[0].sourceSystem).toBe('equifax');
    expect(result.latestScores[0].scoreValue).toBe(720);
    expect(result.latestScores[0].scoreBand).toBe('Good');
  });

  it('returns debt summary for open tradelines', async () => {
    const db = await createSeededDb();
    const result = getDashboard(db);

    // The example has 1 open mortgage tradeline
    expect(result.debtSummary.openTradelineCount).toBe(1);
    expect(result.debtSummary.totalBalance).toBe(33251100); // from snapshot
  });

  it('returns recent imports with metadata', async () => {
    const db = await createSeededDb();
    const result = getDashboard(db);

    expect(result.recentImports).toHaveLength(1);
    expect(result.recentImports[0].importId).toBe('imp_2026_02_07_eqf');
    expect(result.recentImports[0].sourceSystem).toBe('equifax');
    expect(result.recentImports[0].acquisitionMethod).toBe('pdf_upload');
  });

  it('has correct DashboardData shape', async () => {
    const db = await createSeededDb();
    const result = getDashboard(db);

    // Verify the full shape
    expect(result).toHaveProperty('counts');
    expect(result).toHaveProperty('latestScores');
    expect(result).toHaveProperty('debtSummary');
    expect(result).toHaveProperty('recentImports');
  });
});
