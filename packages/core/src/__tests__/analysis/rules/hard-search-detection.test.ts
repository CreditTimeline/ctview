import { describe, it, expect } from 'vitest';
import { createTestDb } from '../../helpers/test-db.js';
import { buildMinimalCreditFile } from '../../helpers/fixtures.js';
import { ingestCreditFile } from '../../../ingestion/ingest-file.js';
import { hardSearchDetection } from '../../../analysis/rules/hard-search-detection.js';
import { DEFAULT_CONFIG } from '../../../analysis/config.js';
import type { AnalysisContext } from '../../../analysis/types.js';
import type { CreditFile } from '../../../types/canonical.js';

function buildCtx(
  db: ReturnType<typeof createTestDb>,
  importIds: string[] = ['imp_test_002'],
  subjectId = 'subj_test_001',
): AnalysisContext {
  return {
    db: db as AnalysisContext['db'],
    file: { subject: { subject_id: subjectId } } as CreditFile,
    subjectId,
    importIds,
    sourceSystemByImportId: new Map(importIds.map((id) => [id, 'equifax'])),
    config: DEFAULT_CONFIG,
  };
}

describe('Hard Search Detection', () => {
  it('returns empty when no hard searches exist', () => {
    const db = createTestDb();

    // First import (baseline)
    ingestCreditFile(db, buildMinimalCreditFile());

    // Second import
    const file2 = {
      ...(buildMinimalCreditFile() as Record<string, unknown>),
      file_id: 'file_test_002',
      created_at: '2026-02-01T00:00:00Z',
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
            name_id: 'name_002',
            full_name: 'Test',
            name_type: 'legal',
            source_import_id: 'imp_test_002',
          },
        ],
      },
    };
    ingestCreditFile(db, file2);

    const results = hardSearchDetection.evaluate(buildCtx(db));
    expect(results).toHaveLength(0);
  });

  it('detects hard searches and classifies severity by count', () => {
    const db = createTestDb();

    // First import with organisation and tradeline (to create a known lender)
    const file1 = {
      ...(buildMinimalCreditFile() as Record<string, unknown>),
      organisations: [
        {
          organisation_id: 'org_lender',
          name: 'Known Bank',
          roles: ['furnisher'],
          source_import_id: 'imp_test_001',
        },
      ],
      tradelines: [
        {
          tradeline_id: 'tl_001',
          furnisher_organisation_id: 'org_lender',
          account_type: 'credit_card',
          status_current: 'up_to_date',
          source_import_id: 'imp_test_001',
        },
      ],
    };
    ingestCreditFile(db, file1);

    // Second import with hard searches
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
            name_id: 'name_002',
            full_name: 'Test',
            name_type: 'legal',
            source_import_id: 'imp_test_002',
          },
        ],
      },
      organisations: [
        {
          organisation_id: 'org_lender',
          name: 'Known Bank',
          roles: ['furnisher'],
          source_import_id: 'imp_test_002',
        },
        {
          organisation_id: 'org_unknown',
          name: 'Unknown Finance',
          roles: ['searcher'],
          source_import_id: 'imp_test_002',
        },
      ],
      searches: [
        {
          search_id: 'sr_h1',
          searched_at: '2026-01-20',
          organisation_id: 'org_lender',
          search_type: 'credit_application',
          visibility: 'hard',
          source_import_id: 'imp_test_002',
        },
        {
          search_id: 'sr_h2',
          searched_at: '2026-01-22',
          organisation_id: 'org_unknown',
          search_type: 'credit_application',
          visibility: 'hard',
          source_import_id: 'imp_test_002',
        },
        {
          search_id: 'sr_h3',
          searched_at: '2026-01-25',
          organisation_id: 'org_unknown',
          search_type: 'credit_application',
          visibility: 'hard',
          source_import_id: 'imp_test_002',
        },
      ],
    };
    ingestCreditFile(db, file2);

    const results = hardSearchDetection.evaluate(buildCtx(db));

    expect(results).toHaveLength(1);
    expect(results[0]!.kind).toBe('hard_search_spike');
    expect(results[0]!.severity).toBe('high'); // 3 >= burstThreshold(3)
    expect(results[0]!.extensions!.searchCount).toBe(3);
    expect(results[0]!.entityIds).toHaveLength(3);

    // Check known lender classification
    const searches = results[0]!.extensions!.searches as Array<{
      searchId: string;
      knownLender: boolean;
    }>;
    const knownSearch = searches.find((s) => s.searchId === 'sr_h1');
    const unknownSearch = searches.find((s) => s.searchId === 'sr_h2');
    expect(knownSearch!.knownLender).toBe(true);
    expect(unknownSearch!.knownLender).toBe(false);
  });

  it('assigns low severity for single hard search', () => {
    const db = createTestDb();
    ingestCreditFile(db, buildMinimalCreditFile());

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
            name_id: 'name_002',
            full_name: 'Test',
            name_type: 'legal',
            source_import_id: 'imp_test_002',
          },
        ],
      },
      searches: [
        {
          search_id: 'sr_single',
          searched_at: '2026-01-25',
          search_type: 'credit_application',
          visibility: 'hard',
          organisation_name_raw: 'Some Corp',
          source_import_id: 'imp_test_002',
        },
      ],
    };
    ingestCreditFile(db, file2);

    const results = hardSearchDetection.evaluate(buildCtx(db));

    expect(results).toHaveLength(1);
    expect(results[0]!.severity).toBe('low');
    expect(results[0]!.extensions!.searchCount).toBe(1);
  });

  it('ignores soft searches', () => {
    const db = createTestDb();
    ingestCreditFile(db, buildMinimalCreditFile());

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
            name_id: 'name_002',
            full_name: 'Test',
            name_type: 'legal',
            source_import_id: 'imp_test_002',
          },
        ],
      },
      searches: [
        {
          search_id: 'sr_soft1',
          searched_at: '2026-01-25',
          search_type: 'consumer_enquiry',
          visibility: 'soft',
          organisation_name_raw: 'Some Corp',
          source_import_id: 'imp_test_002',
        },
        {
          search_id: 'sr_soft2',
          searched_at: '2026-01-26',
          search_type: 'consumer_enquiry',
          visibility: 'soft',
          organisation_name_raw: 'Some Corp',
          source_import_id: 'imp_test_002',
        },
      ],
    };
    ingestCreditFile(db, file2);

    const results = hardSearchDetection.evaluate(buildCtx(db));
    expect(results).toHaveLength(0);
  });
});
