import { describe, it, expect } from 'vitest';
import { createTestDb } from '../../helpers/test-db.js';
import { buildCreditFileWithTradeline } from '../../helpers/fixtures.js';
import { ingestCreditFile } from '../../../ingestion/ingest-file.js';
import { balanceChangeDetection } from '../../../analysis/rules/balance-change-detection.js';
import { DEFAULT_CONFIG } from '../../../analysis/config.js';
import type { AnalysisContext } from '../../../analysis/types.js';
import type { CreditFile } from '../../../types/canonical.js';

function buildCtx(db: ReturnType<typeof createTestDb>, subjectId = 'subj_test_001'): AnalysisContext {
  return {
    db: db as AnalysisContext['db'],
    file: { subject: { subject_id: subjectId } } as CreditFile,
    subjectId,
    importIds: ['imp_test_001'],
    sourceSystemByImportId: new Map([['imp_test_001', 'equifax']]),
    config: DEFAULT_CONFIG,
  };
}

describe('Balance Change Detection', () => {
  it('returns empty when only one snapshot exists', () => {
    const db = createTestDb();
    ingestCreditFile(db, buildCreditFileWithTradeline());

    const ctx = buildCtx(db);
    const results = balanceChangeDetection.evaluate(ctx);

    expect(results).toHaveLength(0);
  });

  it('detects a large balance increase between snapshots', () => {
    const db = createTestDb();

    const file = {
      schema_version: '1.0.0',
      file_id: 'file_test_001',
      subject_id: 'subj_test_001',
      created_at: '2026-01-01T00:00:00Z',
      currency_code: 'GBP',
      imports: [
        {
          import_id: 'imp_test_001',
          imported_at: '2026-01-01T00:00:00Z',
          source_system: 'equifax',
          acquisition_method: 'api',
        },
      ],
      subject: {
        subject_id: 'subj_test_001',
        names: [{ name_id: 'name_001', full_name: 'Test Person', name_type: 'legal', source_import_id: 'imp_test_001' }],
      },
      tradelines: [
        {
          tradeline_id: 'tl_bal_001',
          account_type: 'credit_card',
          furnisher_name_raw: 'Test Bank',
          status_current: 'up_to_date',
          source_import_id: 'imp_test_001',
          snapshots: [
            { snapshot_id: 'snap_a', as_of_date: '2025-11-01', current_balance: 50000, credit_limit: 200000, source_import_id: 'imp_test_001' },
            { snapshot_id: 'snap_b', as_of_date: '2025-12-01', current_balance: 150000, credit_limit: 200000, source_import_id: 'imp_test_001' },
          ],
        },
      ],
    };
    ingestCreditFile(db, file);

    const ctx = buildCtx(db);
    const results = balanceChangeDetection.evaluate(ctx);

    expect(results).toHaveLength(1);
    expect(results[0]!.kind).toBe('unexpected_balance_change');
    expect(results[0]!.extensions!.direction).toBe('increase');
    expect(results[0]!.extensions!.balanceOld).toBe(50000);
    expect(results[0]!.extensions!.balanceNew).toBe(150000);
    expect(results[0]!.entityIds).toContain('snap_a');
    expect(results[0]!.entityIds).toContain('snap_b');
    expect(results[0]!.entityIds).toContain('tl_bal_001');
  });

  it('skips changes below threshold', () => {
    const db = createTestDb();

    const file = {
      schema_version: '1.0.0',
      file_id: 'file_test_001',
      subject_id: 'subj_test_001',
      created_at: '2026-01-01T00:00:00Z',
      currency_code: 'GBP',
      imports: [
        {
          import_id: 'imp_test_001',
          imported_at: '2026-01-01T00:00:00Z',
          source_system: 'equifax',
          acquisition_method: 'api',
        },
      ],
      subject: {
        subject_id: 'subj_test_001',
        names: [{ name_id: 'name_001', full_name: 'Test Person', name_type: 'legal', source_import_id: 'imp_test_001' }],
      },
      tradelines: [
        {
          tradeline_id: 'tl_small_001',
          account_type: 'credit_card',
          furnisher_name_raw: 'Test Bank',
          status_current: 'up_to_date',
          source_import_id: 'imp_test_001',
          snapshots: [
            { snapshot_id: 'snap_c', as_of_date: '2025-11-01', current_balance: 100000, credit_limit: 200000, source_import_id: 'imp_test_001' },
            { snapshot_id: 'snap_d', as_of_date: '2025-12-01', current_balance: 110000, credit_limit: 200000, source_import_id: 'imp_test_001' },
          ],
        },
      ],
    };
    ingestCreditFile(db, file);

    const ctx = buildCtx(db);
    const results = balanceChangeDetection.evaluate(ctx);

    // 10% change with 10000 abs — pct < 25% threshold
    expect(results).toHaveLength(0);
  });

  it('skips changes where absolute delta is below minimum', () => {
    const db = createTestDb();

    const file = {
      schema_version: '1.0.0',
      file_id: 'file_test_001',
      subject_id: 'subj_test_001',
      created_at: '2026-01-01T00:00:00Z',
      currency_code: 'GBP',
      imports: [
        {
          import_id: 'imp_test_001',
          imported_at: '2026-01-01T00:00:00Z',
          source_system: 'equifax',
          acquisition_method: 'api',
        },
      ],
      subject: {
        subject_id: 'subj_test_001',
        names: [{ name_id: 'name_001', full_name: 'Test Person', name_type: 'legal', source_import_id: 'imp_test_001' }],
      },
      tradelines: [
        {
          tradeline_id: 'tl_tiny_001',
          account_type: 'credit_card',
          furnisher_name_raw: 'Test Bank',
          status_current: 'up_to_date',
          source_import_id: 'imp_test_001',
          snapshots: [
            { snapshot_id: 'snap_e', as_of_date: '2025-11-01', current_balance: 1000, credit_limit: 200000, source_import_id: 'imp_test_001' },
            { snapshot_id: 'snap_f', as_of_date: '2025-12-01', current_balance: 5000, credit_limit: 200000, source_import_id: 'imp_test_001' },
          ],
        },
      ],
    };
    ingestCreditFile(db, file);

    const ctx = buildCtx(db);
    const results = balanceChangeDetection.evaluate(ctx);

    // 400% change but abs delta only 4000 (below 10000 minimum)
    expect(results).toHaveLength(0);
  });

  it('assigns correct severity tiers', () => {
    const db = createTestDb();

    const file = {
      schema_version: '1.0.0',
      file_id: 'file_test_001',
      subject_id: 'subj_test_001',
      created_at: '2026-01-01T00:00:00Z',
      currency_code: 'GBP',
      imports: [
        {
          import_id: 'imp_test_001',
          imported_at: '2026-01-01T00:00:00Z',
          source_system: 'equifax',
          acquisition_method: 'api',
        },
      ],
      subject: {
        subject_id: 'subj_test_001',
        names: [{ name_id: 'name_001', full_name: 'Test Person', name_type: 'legal', source_import_id: 'imp_test_001' }],
      },
      tradelines: [
        {
          tradeline_id: 'tl_sev_001',
          account_type: 'credit_card',
          furnisher_name_raw: 'Test Bank',
          status_current: 'up_to_date',
          source_import_id: 'imp_test_001',
          snapshots: [
            { snapshot_id: 'snap_g', as_of_date: '2025-10-01', current_balance: 100000, credit_limit: 500000, source_import_id: 'imp_test_001' },
            // 50% increase (medium)
            { snapshot_id: 'snap_h', as_of_date: '2025-11-01', current_balance: 150000, credit_limit: 500000, source_import_id: 'imp_test_001' },
            // 100%+ increase from previous (high)
            { snapshot_id: 'snap_i', as_of_date: '2025-12-01', current_balance: 400000, credit_limit: 500000, source_import_id: 'imp_test_001' },
          ],
        },
      ],
    };
    ingestCreditFile(db, file);

    const ctx = buildCtx(db);
    const results = balanceChangeDetection.evaluate(ctx);

    expect(results.length).toBeGreaterThanOrEqual(1);
    const severities = results.map((r) => r.severity);
    expect(severities).toContain('medium');
    expect(severities).toContain('high');
  });
});
