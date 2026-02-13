import { describe, it, expect } from 'vitest';
import { createTestDb } from '../../helpers/test-db.js';
import { buildCreditFileWithTradeline } from '../../helpers/fixtures.js';
import { ingestCreditFile } from '../../../ingestion/ingest-file.js';
import { newTradelineDetection } from '../../../analysis/rules/new-tradeline-detection.js';
import { DEFAULT_CONFIG } from '../../../analysis/config.js';
import type { AnalysisContext } from '../../../analysis/types.js';
import type { CreditFile } from '../../../types/canonical.js';

function buildCtx(
  db: ReturnType<typeof createTestDb>,
  file: unknown,
  importIds: string[],
): AnalysisContext {
  const f = file as CreditFile;
  const sourceMap = new Map<string, string>();
  for (const imp of f.imports) sourceMap.set(imp.import_id, imp.source_system);
  return {
    db: db as AnalysisContext['db'],
    file: f,
    subjectId: f.subject.subject_id,
    importIds,
    sourceSystemByImportId: sourceMap,
    config: DEFAULT_CONFIG,
  };
}

describe('New Tradeline Detection', () => {
  it('skips when there is only one import (no historical baseline)', () => {
    const db = createTestDb();
    const file = buildCreditFileWithTradeline();
    ingestCreditFile(db, file);

    const ctx = buildCtx(db, file, ['imp_test_001']);
    const results = newTradelineDetection.evaluate(ctx);

    expect(results).toHaveLength(0);
  });

  it('detects a new tradeline in a second import', () => {
    const db = createTestDb();

    // First import with one tradeline
    const file1 = buildCreditFileWithTradeline();
    ingestCreditFile(db, file1);

    // Second import with a new tradeline
    const file2 = {
      schema_version: '1.0.0',
      file_id: 'file_test_002',
      subject_id: 'subj_test_001',
      created_at: '2026-02-01T00:00:00Z',
      currency_code: 'GBP',
      imports: [
        {
          import_id: 'imp_test_002',
          imported_at: '2026-02-01T00:00:00Z',
          source_system: 'equifax',
          acquisition_method: 'api',
        },
      ],
      subject: {
        subject_id: 'subj_test_001',
        names: [
          {
            name_id: 'name_test_002',
            full_name: 'Test Person',
            name_type: 'legal',
            source_import_id: 'imp_test_002',
          },
        ],
      },
      organisations: [
        {
          organisation_id: 'org_test_002',
          name: 'New Lender',
          roles: ['furnisher'],
          source_import_id: 'imp_test_002',
        },
      ],
      tradelines: [
        {
          tradeline_id: 'tl_new_001',
          furnisher_organisation_id: 'org_test_002',
          account_type: 'unsecured_loan',
          opened_at: '2026-01-20',
          status_current: 'up_to_date',
          source_import_id: 'imp_test_002',
        },
      ],
    };
    ingestCreditFile(db, file2);

    const ctx = buildCtx(db, file2, ['imp_test_002']);
    const results = newTradelineDetection.evaluate(ctx);

    expect(results).toHaveLength(1);
    expect(results[0]!.kind).toBe('new_tradeline_detected');
    expect(results[0]!.extensions!.classification).toBe('expected');
    expect(results[0]!.severity).toBe('info');
    expect(results[0]!.entityIds).toContain('tl_new_001');
  });

  it('classifies old tradelines as unexpected', () => {
    const db = createTestDb();

    const file1 = buildCreditFileWithTradeline();
    ingestCreditFile(db, file1);

    const file2 = {
      schema_version: '1.0.0',
      file_id: 'file_test_002',
      subject_id: 'subj_test_001',
      created_at: '2026-02-01T00:00:00Z',
      currency_code: 'GBP',
      imports: [
        {
          import_id: 'imp_test_002',
          imported_at: '2026-02-01T00:00:00Z',
          source_system: 'equifax',
          acquisition_method: 'api',
        },
      ],
      subject: {
        subject_id: 'subj_test_001',
        names: [
          {
            name_id: 'name_test_002',
            full_name: 'Test Person',
            name_type: 'legal',
            source_import_id: 'imp_test_002',
          },
        ],
      },
      tradelines: [
        {
          tradeline_id: 'tl_old_001',
          account_type: 'mortgage',
          furnisher_name_raw: 'Test Bank',
          opened_at: '2020-01-01',
          status_current: 'up_to_date',
          source_import_id: 'imp_test_002',
        },
      ],
    };
    ingestCreditFile(db, file2);

    const ctx = buildCtx(db, file2, ['imp_test_002']);
    const results = newTradelineDetection.evaluate(ctx);

    expect(results).toHaveLength(1);
    expect(results[0]!.extensions!.classification).toBe('unexpected');
    expect(results[0]!.severity).toBe('low');
  });

  it('escalates severity when multiple unexpected tradelines appear', () => {
    const db = createTestDb();

    const file1 = buildCreditFileWithTradeline();
    ingestCreditFile(db, file1);

    const file2 = {
      schema_version: '1.0.0',
      file_id: 'file_test_002',
      subject_id: 'subj_test_001',
      created_at: '2026-02-01T00:00:00Z',
      currency_code: 'GBP',
      imports: [
        {
          import_id: 'imp_test_002',
          imported_at: '2026-02-01T00:00:00Z',
          source_system: 'equifax',
          acquisition_method: 'api',
        },
      ],
      subject: {
        subject_id: 'subj_test_001',
        names: [
          {
            name_id: 'name_test_002',
            full_name: 'Test Person',
            name_type: 'legal',
            source_import_id: 'imp_test_002',
          },
        ],
      },
      tradelines: [
        {
          tradeline_id: 'tl_unexp_001',
          account_type: 'mortgage',
          furnisher_name_raw: 'Test Bank',
          opened_at: '2020-01-01',
          status_current: 'up_to_date',
          source_import_id: 'imp_test_002',
        },
        {
          tradeline_id: 'tl_unexp_002',
          account_type: 'unsecured_loan',
          furnisher_name_raw: 'Test Bank',
          opened_at: '2019-06-01',
          status_current: 'up_to_date',
          source_import_id: 'imp_test_002',
        },
      ],
    };
    ingestCreditFile(db, file2);

    const ctx = buildCtx(db, file2, ['imp_test_002']);
    const results = newTradelineDetection.evaluate(ctx);

    expect(results).toHaveLength(2);
    for (const r of results) {
      expect(r.severity).toBe('medium');
    }
  });

  it('does not flag tradelines already present in prior imports', () => {
    const db = createTestDb();

    const file1 = buildCreditFileWithTradeline();
    ingestCreditFile(db, file1);

    // Second import with the same tradeline_id
    const file2 = {
      schema_version: '1.0.0',
      file_id: 'file_test_002',
      subject_id: 'subj_test_001',
      created_at: '2026-02-01T00:00:00Z',
      currency_code: 'GBP',
      imports: [
        {
          import_id: 'imp_test_002',
          imported_at: '2026-02-01T00:00:00Z',
          source_system: 'equifax',
          acquisition_method: 'api',
        },
      ],
      subject: {
        subject_id: 'subj_test_001',
        names: [
          {
            name_id: 'name_test_002',
            full_name: 'Test Person',
            name_type: 'legal',
            source_import_id: 'imp_test_002',
          },
        ],
      },
      organisations: [
        {
          organisation_id: 'org_test_001',
          name: 'Test Bank',
          roles: ['furnisher'],
          source_import_id: 'imp_test_002',
        },
      ],
      tradelines: [
        {
          tradeline_id: 'tl_test_001',
          furnisher_organisation_id: 'org_test_001',
          account_type: 'credit_card',
          opened_at: '2023-01-01',
          status_current: 'up_to_date',
          source_import_id: 'imp_test_002',
        },
      ],
    };
    ingestCreditFile(db, file2);

    const ctx = buildCtx(db, file2, ['imp_test_002']);
    const results = newTradelineDetection.evaluate(ctx);

    expect(results).toHaveLength(0);
  });
});
