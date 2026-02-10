import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { CreditFile } from '../../types/canonical.js';

/**
 * Loads the full example credit file from spec/examples/.
 * Returns parsed JSON as a plain object (not typed — mimics raw API input).
 */
export function loadExampleCreditFile(): unknown {
  const path = resolve(process.cwd(), 'spec/examples/credittimeline-file.v1.example.json');
  return JSON.parse(readFileSync(path, 'utf-8'));
}

/**
 * Builds a minimal valid credit file payload for testing.
 * Includes just enough data to pass schema + referential validation.
 */
export function buildMinimalCreditFile(overrides?: Partial<CreditFile>): unknown {
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
          name_id: 'name_test_001',
          full_name: 'Test Person',
          name_type: 'legal',
          source_import_id: 'imp_test_001',
        },
      ],
    },
    ...overrides,
  };
}

/**
 * Builds a credit file payload with a tradeline and all child entities.
 */
export function buildCreditFileWithTradeline(overrides?: Partial<CreditFile>): unknown {
  const base = buildMinimalCreditFile() as Record<string, unknown>;
  return {
    ...base,
    organisations: [
      {
        organisation_id: 'org_test_001',
        name: 'Test Bank',
        roles: ['furnisher'],
        source_import_id: 'imp_test_001',
      },
    ],
    addresses: [
      {
        address_id: 'addr_test_001',
        line_1: '1 Test Street',
        postcode: 'TE1 1ST',
        country_code: 'GB',
      },
    ],
    address_associations: [
      {
        association_id: 'assoc_test_001',
        address_id: 'addr_test_001',
        role: 'current',
        source_import_id: 'imp_test_001',
      },
    ],
    tradelines: [
      {
        tradeline_id: 'tl_test_001',
        furnisher_organisation_id: 'org_test_001',
        account_type: 'credit_card',
        opened_at: '2023-01-01',
        status_current: 'up_to_date',
        identifiers: [
          {
            identifier_id: 'tid_test_001',
            identifier_type: 'masked_account_number',
            value: 'XXXX1234',
            source_import_id: 'imp_test_001',
          },
        ],
        parties: [
          {
            party_id: 'party_test_001',
            party_role: 'primary',
            name: 'Test Person',
            source_import_id: 'imp_test_001',
          },
        ],
        terms: {
          terms_id: 'terms_test_001',
          term_type: 'revolving',
          source_import_id: 'imp_test_001',
        },
        snapshots: [
          {
            snapshot_id: 'snap_test_001',
            as_of_date: '2025-12-01',
            current_balance: 50000,
            credit_limit: 200000,
            source_import_id: 'imp_test_001',
          },
        ],
        monthly_metrics: [
          {
            monthly_metric_id: 'mm_test_001',
            period: '2025-12',
            metric_type: 'payment_status',
            value_text: '0',
            canonical_status: 'up_to_date',
            raw_status_code: '0',
            source_import_id: 'imp_test_001',
          },
        ],
        events: [
          {
            event_id: 'evt_test_001',
            event_type: 'other',
            event_date: '2023-01-01',
            source_import_id: 'imp_test_001',
          },
        ],
        source_import_id: 'imp_test_001',
      },
    ],
    ...overrides,
  };
}
