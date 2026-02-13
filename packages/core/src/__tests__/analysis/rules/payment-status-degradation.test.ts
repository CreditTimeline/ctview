import { describe, it, expect } from 'vitest';
import { createTestDb } from '../../helpers/test-db.js';
import { ingestCreditFile } from '../../../ingestion/ingest-file.js';
import { paymentStatusDegradation } from '../../../analysis/rules/payment-status-degradation.js';
import { DEFAULT_CONFIG } from '../../../analysis/config.js';
import type { AnalysisContext } from '../../../analysis/types.js';
import type { CreditFile } from '../../../types/canonical.js';

function buildCtx(
  db: ReturnType<typeof createTestDb>,
  subjectId = 'subj_test_001',
): AnalysisContext {
  return {
    db: db as AnalysisContext['db'],
    file: { subject: { subject_id: subjectId } } as CreditFile,
    subjectId,
    importIds: ['imp_test_001'],
    sourceSystemByImportId: new Map([['imp_test_001', 'equifax']]),
    config: DEFAULT_CONFIG,
  };
}

function buildFileWithStatuses(statuses: { snapshotId: string; date: string; status: string }[]) {
  return {
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
      names: [
        {
          name_id: 'name_001',
          full_name: 'Test',
          name_type: 'legal',
          source_import_id: 'imp_test_001',
        },
      ],
    },
    tradelines: [
      {
        tradeline_id: 'tl_status_001',
        account_type: 'credit_card',
        furnisher_name_raw: 'Test Bank',
        status_current: statuses[statuses.length - 1]!.status,
        source_import_id: 'imp_test_001',
        snapshots: statuses.map((s) => ({
          snapshot_id: s.snapshotId,
          as_of_date: s.date,
          current_balance: 50000,
          status_current: s.status,
          source_import_id: 'imp_test_001',
        })),
      },
    ],
  };
}

describe('Payment Status Degradation', () => {
  it('returns empty when status is stable', () => {
    const db = createTestDb();
    const file = buildFileWithStatuses([
      { snapshotId: 'snap_1', date: '2025-11-01', status: 'up_to_date' },
      { snapshotId: 'snap_2', date: '2025-12-01', status: 'up_to_date' },
    ]);
    ingestCreditFile(db, file);

    const results = paymentStatusDegradation.evaluate(buildCtx(db));
    expect(results).toHaveLength(0);
  });

  it('detects degradation from up_to_date to in_arrears (low severity)', async () => {
    const db = createTestDb();
    const file = buildFileWithStatuses([
      { snapshotId: 'snap_1', date: '2025-11-01', status: 'up_to_date' },
      { snapshotId: 'snap_2', date: '2025-12-01', status: 'arrangement' },
    ]);
    const ingestResult = await ingestCreditFile(db, file);
    expect(ingestResult.success).toBe(true);

    const results = paymentStatusDegradation.evaluate(buildCtx(db));

    expect(results).toHaveLength(1);
    expect(results[0]!.kind).toBe('payment_status_degradation');
    expect(results[0]!.severity).toBe('low');
    expect(results[0]!.extensions!.previousStatus).toBe('up_to_date');
    expect(results[0]!.extensions!.currentStatus).toBe('arrangement');
  });

  it('detects degradation to default status (high severity)', () => {
    const db = createTestDb();
    const file = buildFileWithStatuses([
      { snapshotId: 'snap_1', date: '2025-11-01', status: 'up_to_date' },
      { snapshotId: 'snap_2', date: '2025-12-01', status: 'default' },
    ]);
    ingestCreditFile(db, file);

    const results = paymentStatusDegradation.evaluate(buildCtx(db));

    expect(results).toHaveLength(1);
    expect(results[0]!.severity).toBe('high');
  });

  it('detects degradation to written_off (high severity)', () => {
    const db = createTestDb();
    const file = buildFileWithStatuses([
      { snapshotId: 'snap_1', date: '2025-11-01', status: 'in_arrears' },
      { snapshotId: 'snap_2', date: '2025-12-01', status: 'written_off' },
    ]);
    ingestCreditFile(db, file);

    const results = paymentStatusDegradation.evaluate(buildCtx(db));

    expect(results).toHaveLength(1);
    expect(results[0]!.severity).toBe('high');
  });

  it('detects medium severity for moderate degradation', () => {
    const db = createTestDb();
    const file = buildFileWithStatuses([
      { snapshotId: 'snap_1', date: '2025-11-01', status: 'up_to_date' },
      { snapshotId: 'snap_2', date: '2025-12-01', status: 'in_arrears' },
    ]);
    ingestCreditFile(db, file);

    const results = paymentStatusDegradation.evaluate(buildCtx(db));

    expect(results).toHaveLength(1);
    // rank delta = 4-1 = 3, so medium
    expect(results[0]!.severity).toBe('medium');
  });

  it('does not flag improvements (status getting better)', () => {
    const db = createTestDb();
    const file = buildFileWithStatuses([
      { snapshotId: 'snap_1', date: '2025-11-01', status: 'in_arrears' },
      { snapshotId: 'snap_2', date: '2025-12-01', status: 'up_to_date' },
    ]);
    ingestCreditFile(db, file);

    const results = paymentStatusDegradation.evaluate(buildCtx(db));
    expect(results).toHaveLength(0);
  });

  it('includes entity IDs for both snapshots and tradeline', () => {
    const db = createTestDb();
    const file = buildFileWithStatuses([
      { snapshotId: 'snap_1', date: '2025-11-01', status: 'up_to_date' },
      { snapshotId: 'snap_2', date: '2025-12-01', status: 'arrangement' },
    ]);
    ingestCreditFile(db, file);

    const results = paymentStatusDegradation.evaluate(buildCtx(db));

    expect(results[0]!.entityIds).toContain('snap_1');
    expect(results[0]!.entityIds).toContain('snap_2');
    expect(results[0]!.entityIds).toContain('tl_status_001');
  });
});
