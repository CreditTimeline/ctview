import { describe, it, expect } from 'vitest';
import { createTestDb } from '../../helpers/test-db.js';
import { ingestCreditFile } from '../../../ingestion/ingest-file.js';
import { crossAgencyDiscrepancy } from '../../../analysis/rules/cross-agency-discrepancy.js';
import { DEFAULT_CONFIG } from '../../../analysis/config.js';
import type { AnalysisContext } from '../../../analysis/types.js';
import type { CreditFile } from '../../../types/canonical.js';

function buildCtx(db: ReturnType<typeof createTestDb>, subjectId = 'subj_test_001'): AnalysisContext {
  return {
    db: db as AnalysisContext['db'],
    file: { subject: { subject_id: subjectId } } as CreditFile,
    subjectId,
    importIds: ['imp_eq_001', 'imp_tu_001'],
    sourceSystemByImportId: new Map([
      ['imp_eq_001', 'equifax'],
      ['imp_tu_001', 'transunion'],
    ]),
    config: DEFAULT_CONFIG,
  };
}

describe('Cross-Agency Discrepancy Detection', () => {
  it('returns empty when no tradelines have canonical_id', () => {
    const db = createTestDb();
    const file = {
      schema_version: '1.0.0',
      file_id: 'file_test_001',
      subject_id: 'subj_test_001',
      created_at: '2026-01-01T00:00:00Z',
      currency_code: 'GBP',
      imports: [
        { import_id: 'imp_eq_001', imported_at: '2026-01-01T00:00:00Z', source_system: 'equifax', acquisition_method: 'api' },
      ],
      subject: { subject_id: 'subj_test_001', names: [{ name_id: 'n1', full_name: 'Test', name_type: 'legal', source_import_id: 'imp_eq_001' }] },
      tradelines: [{
        tradeline_id: 'tl_no_canon',
        account_type: 'credit_card',
        furnisher_name_raw: 'Test Bank',
        status_current: 'up_to_date',
        source_import_id: 'imp_eq_001',
        snapshots: [
          { snapshot_id: 'snap_nc1', as_of_date: '2025-12-01', current_balance: 50000, credit_limit: 200000, source_import_id: 'imp_eq_001' },
        ],
      }],
    };
    ingestCreditFile(db, file);

    const ctx = buildCtx(db);
    ctx.importIds = ['imp_eq_001'];
    const results = crossAgencyDiscrepancy.evaluate(ctx);
    expect(results).toHaveLength(0);
  });

  it('detects balance discrepancy between agencies', () => {
    const db = createTestDb();

    // File from equifax
    const file1 = {
      schema_version: '1.0.0',
      file_id: 'file_eq',
      subject_id: 'subj_test_001',
      created_at: '2026-01-01T00:00:00Z',
      currency_code: 'GBP',
      imports: [
        { import_id: 'imp_eq_001', imported_at: '2026-01-01T00:00:00Z', source_system: 'equifax', acquisition_method: 'api' },
      ],
      subject: { subject_id: 'subj_test_001', names: [{ name_id: 'n1', full_name: 'Test', name_type: 'legal', source_import_id: 'imp_eq_001' }] },
      tradelines: [{
        tradeline_id: 'tl_eq_001',
        canonical_id: 'canon_001',
        account_type: 'credit_card',
        furnisher_name_raw: 'Test Bank',
        status_current: 'up_to_date',
        source_import_id: 'imp_eq_001',
        snapshots: [
          { snapshot_id: 'snap_eq1', as_of_date: '2025-12-01', current_balance: 100000, credit_limit: 200000, source_import_id: 'imp_eq_001' },
        ],
      }],
    };
    ingestCreditFile(db, file1);

    // File from transunion with different balance
    const file2 = {
      schema_version: '1.0.0',
      file_id: 'file_tu',
      subject_id: 'subj_test_001',
      created_at: '2026-01-02T00:00:00Z',
      currency_code: 'GBP',
      imports: [
        { import_id: 'imp_tu_001', imported_at: '2026-01-02T00:00:00Z', source_system: 'transunion', acquisition_method: 'api' },
      ],
      subject: { subject_id: 'subj_test_001', names: [{ name_id: 'n2', full_name: 'Test', name_type: 'legal', source_import_id: 'imp_tu_001' }] },
      tradelines: [{
        tradeline_id: 'tl_tu_001',
        canonical_id: 'canon_001',
        account_type: 'credit_card',
        furnisher_name_raw: 'Test Bank',
        status_current: 'up_to_date',
        source_import_id: 'imp_tu_001',
        snapshots: [
          { snapshot_id: 'snap_tu1', as_of_date: '2025-12-01', current_balance: 150000, credit_limit: 200000, source_import_id: 'imp_tu_001' },
        ],
      }],
    };
    ingestCreditFile(db, file2);

    const ctx = buildCtx(db);
    const results = crossAgencyDiscrepancy.evaluate(ctx);

    expect(results).toHaveLength(1);
    expect(results[0]!.kind).toBe('cross_agency_discrepancy');
    expect(results[0]!.entityIds).toContain('tl_eq_001');
    expect(results[0]!.entityIds).toContain('tl_tu_001');

    const discrepancies = results[0]!.extensions!.discrepancies as Array<{ field: string }>;
    expect(discrepancies.some((d) => d.field === 'balance')).toBe(true);
  });

  it('detects status conflict between agencies (high severity)', () => {
    const db = createTestDb();

    const file1 = {
      schema_version: '1.0.0',
      file_id: 'file_eq',
      subject_id: 'subj_test_001',
      created_at: '2026-01-01T00:00:00Z',
      currency_code: 'GBP',
      imports: [
        { import_id: 'imp_eq_001', imported_at: '2026-01-01T00:00:00Z', source_system: 'equifax', acquisition_method: 'api' },
      ],
      subject: { subject_id: 'subj_test_001', names: [{ name_id: 'n1', full_name: 'Test', name_type: 'legal', source_import_id: 'imp_eq_001' }] },
      tradelines: [{
        tradeline_id: 'tl_eq_002',
        canonical_id: 'canon_002',
        account_type: 'unsecured_loan',
        furnisher_name_raw: 'Test Bank',
        status_current: 'up_to_date',
        source_import_id: 'imp_eq_001',
      }],
    };
    ingestCreditFile(db, file1);

    const file2 = {
      schema_version: '1.0.0',
      file_id: 'file_tu2',
      subject_id: 'subj_test_001',
      created_at: '2026-01-02T00:00:00Z',
      currency_code: 'GBP',
      imports: [
        { import_id: 'imp_tu_001', imported_at: '2026-01-02T00:00:00Z', source_system: 'transunion', acquisition_method: 'api' },
      ],
      subject: { subject_id: 'subj_test_001', names: [{ name_id: 'n2', full_name: 'Test', name_type: 'legal', source_import_id: 'imp_tu_001' }] },
      tradelines: [{
        tradeline_id: 'tl_tu_002',
        canonical_id: 'canon_002',
        account_type: 'unsecured_loan',
        furnisher_name_raw: 'Test Bank',
        status_current: 'default',
        source_import_id: 'imp_tu_001',
      }],
    };
    ingestCreditFile(db, file2);

    const ctx = buildCtx(db);
    const results = crossAgencyDiscrepancy.evaluate(ctx);

    expect(results).toHaveLength(1);
    expect(results[0]!.severity).toBe('high');

    const discrepancies = results[0]!.extensions!.discrepancies as Array<{ field: string }>;
    expect(discrepancies.some((d) => d.field === 'status')).toBe(true);
  });

  it('does not flag tradelines from the same agency', () => {
    const db = createTestDb();

    const file = {
      schema_version: '1.0.0',
      file_id: 'file_eq',
      subject_id: 'subj_test_001',
      created_at: '2026-01-01T00:00:00Z',
      currency_code: 'GBP',
      imports: [
        { import_id: 'imp_eq_001', imported_at: '2026-01-01T00:00:00Z', source_system: 'equifax', acquisition_method: 'api' },
      ],
      subject: { subject_id: 'subj_test_001', names: [{ name_id: 'n1', full_name: 'Test', name_type: 'legal', source_import_id: 'imp_eq_001' }] },
      tradelines: [
        {
          tradeline_id: 'tl_same_1',
          canonical_id: 'canon_same',
          account_type: 'credit_card',
          furnisher_name_raw: 'Test Bank',
          status_current: 'up_to_date',
          source_import_id: 'imp_eq_001',
          snapshots: [{ snapshot_id: 'snap_same1', as_of_date: '2025-12-01', current_balance: 100000, source_import_id: 'imp_eq_001' }],
        },
        {
          tradeline_id: 'tl_same_2',
          canonical_id: 'canon_same',
          account_type: 'credit_card',
          furnisher_name_raw: 'Test Bank',
          status_current: 'up_to_date',
          source_import_id: 'imp_eq_001',
          snapshots: [{ snapshot_id: 'snap_same2', as_of_date: '2025-12-01', current_balance: 200000, source_import_id: 'imp_eq_001' }],
        },
      ],
    };
    ingestCreditFile(db, file);

    const ctx = buildCtx(db);
    ctx.importIds = ['imp_eq_001'];
    const results = crossAgencyDiscrepancy.evaluate(ctx);

    // Same agency — no cross-agency discrepancy
    expect(results).toHaveLength(0);
  });
});
