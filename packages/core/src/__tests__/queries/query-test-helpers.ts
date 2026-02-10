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

