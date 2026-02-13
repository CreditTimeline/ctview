import { createTestDb } from '../helpers/test-db.js';
import {
  buildMinimalCreditFile,
  buildCreditFileWithTradeline,
  loadExampleCreditFile,
} from '../helpers/fixtures.js';
import { ingestCreditFile } from '../../ingestion/ingest-file.js';
import type { AppDatabase } from '../../db/client.js';

/**
 * Creates a test DB and ingests the full example file.
 * Returns the db instance ready for query testing.
 */
export async function createSeededDb(): Promise<AppDatabase> {
  const db = createTestDb();
  const data = loadExampleCreditFile();
  const result = await ingestCreditFile(db, data);
  if (!result.success) throw new Error(`Seed failed: ${result.errors?.join(', ')}`);
  return db;
}

/**
 * Creates a test DB and ingests a tradeline-focused fixture.
 */
export async function createTradelineSeededDb(): Promise<AppDatabase> {
  const db = createTestDb();
  const data = buildCreditFileWithTradeline();
  const result = await ingestCreditFile(db, data);
  if (!result.success) throw new Error(`Seed failed: ${result.errors?.join(', ')}`);
  return db;
}

/**
 * Builds a credit file with search records for testing.
 */
export function buildCreditFileWithSearches(): unknown {
  const base = buildMinimalCreditFile();
  return {
    ...(base as Record<string, unknown>),
    organisations: [
      {
        organisation_id: 'org_search_01',
        name: 'Bank Search Ltd',
        roles: ['searcher'],
        source_import_id: 'imp_test_001',
      },
    ],
    searches: [
      {
        search_id: 'sr_test_001',
        searched_at: '2026-01-15',
        organisation_id: 'org_search_01',
        search_type: 'credit_application',
        visibility: 'hard',
        purpose_text: 'Credit application check',
        source_import_id: 'imp_test_001',
      },
      {
        search_id: 'sr_test_002',
        searched_at: '2026-01-20',
        organisation_id: 'org_search_01',
        search_type: 'consumer_enquiry',
        visibility: 'soft',
        purpose_text: 'Consumer enquiry',
        source_import_id: 'imp_test_001',
      },
      {
        search_id: 'sr_test_003',
        searched_at: '2026-02-01',
        search_type: 'identity_check',
        visibility: 'soft',
        organisation_name_raw: 'Unknown Org',
        source_import_id: 'imp_test_001',
      },
    ],
  };
}

/**
 * Builds a credit file with multiple credit scores.
 */
export function buildCreditFileWithScores(): unknown {
  const base = buildMinimalCreditFile();
  return {
    ...(base as Record<string, unknown>),
    credit_scores: [
      {
        score_id: 'score_test_001',
        score_type: 'credit_score',
        score_name: 'Equifax Score',
        score_value: 720,
        score_min: 0,
        score_max: 1000,
        score_band: 'Good',
        calculated_at: '2026-01-01',
        score_factors: ['Long history', 'Low utilization'],
        source_import_id: 'imp_test_001',
      },
      {
        score_id: 'score_test_002',
        score_type: 'credit_score',
        score_name: 'Equifax Score',
        score_value: 740,
        score_min: 0,
        score_max: 1000,
        score_band: 'Good',
        calculated_at: '2026-02-01',
        score_factors: ['Long history'],
        source_import_id: 'imp_test_001',
      },
    ],
  };
}

/**
 * Builds a credit file with public records for testing.
 */
export function buildCreditFileWithPublicRecords(): unknown {
  const base = buildMinimalCreditFile();
  return {
    ...(base as Record<string, unknown>),
    public_records: [
      {
        public_record_id: 'pr_test_001',
        record_type: 'ccj',
        court_or_register: 'Northampton County Court',
        amount: 250000,
        recorded_at: '2024-06-15',
        status: 'active',
        source_import_id: 'imp_test_001',
      },
      {
        public_record_id: 'pr_test_002',
        record_type: 'bankruptcy',
        court_or_register: 'London Gazette',
        amount: 5000000,
        recorded_at: '2023-01-10',
        satisfied_at: '2024-01-10',
        status: 'discharged',
        source_import_id: 'imp_test_001',
      },
      {
        public_record_id: 'pr_test_003',
        record_type: 'iva',
        amount: 1500000,
        recorded_at: '2025-03-01',
        status: 'active',
        source_import_id: 'imp_test_001',
      },
    ],
  };
}

/**
 * Builds a credit file with address links (move history) for testing.
 */
export function buildCreditFileWithAddressLinks(): unknown {
  const base = buildMinimalCreditFile();
  return {
    ...(base as Record<string, unknown>),
    addresses: [
      {
        address_id: 'addr_old_001',
        line_1: '5 Old Street',
        town_city: 'London',
        postcode: 'EC1V 9HL',
        country_code: 'GB',
        normalized_single_line: '5 OLD STREET, LONDON, EC1V 9HL',
      },
      {
        address_id: 'addr_new_001',
        line_1: '10 New Road',
        town_city: 'Manchester',
        postcode: 'M1 1AA',
        country_code: 'GB',
        normalized_single_line: '10 NEW ROAD, MANCHESTER, M1 1AA',
      },
      {
        address_id: 'addr_newest_001',
        line_1: '20 Latest Avenue',
        town_city: 'Bristol',
        postcode: 'BS1 1AB',
        country_code: 'GB',
        normalized_single_line: '20 LATEST AVENUE, BRISTOL, BS1 1AB',
      },
    ],
    address_associations: [
      {
        association_id: 'assoc_link_001',
        address_id: 'addr_newest_001',
        role: 'current',
        valid_from: '2025-06-01',
        source_import_id: 'imp_test_001',
      },
      {
        association_id: 'assoc_link_002',
        address_id: 'addr_new_001',
        role: 'previous',
        valid_from: '2024-01-01',
        valid_to: '2025-06-01',
        source_import_id: 'imp_test_001',
      },
    ],
    address_links: [
      {
        address_link_id: 'al_test_001',
        from_address_id: 'addr_old_001',
        to_address_id: 'addr_new_001',
        source_organisation_name: 'TransUnion',
        last_confirmed_at: '2024-01-15',
        source_import_id: 'imp_test_001',
      },
      {
        address_link_id: 'al_test_002',
        from_address_id: 'addr_new_001',
        to_address_id: 'addr_newest_001',
        source_organisation_name: 'TransUnion',
        last_confirmed_at: '2025-06-10',
        source_import_id: 'imp_test_001',
      },
    ],
  };
}
