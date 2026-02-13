import { describe, it, expect } from 'vitest';
import { createTestDb } from '../helpers/test-db.js';
import { buildCreditFileWithTradeline } from '../helpers/fixtures.js';
import { ingestCreditFile } from '../../ingestion/ingest-file.js';
import {
  getCreditUtilizationTrend,
  getScoreEventCorrelation,
  getPaymentPatternAnalysis,
} from '../../queries/trends.js';

describe('Trend Queries', () => {
  describe('getCreditUtilizationTrend', () => {
    it('returns utilization points from snapshots with credit limits', () => {
      const db = createTestDb();
      ingestCreditFile(db, buildCreditFileWithTradeline());

      const result = getCreditUtilizationTrend(db, 'subj_test_001');

      expect(result.points).toHaveLength(1);
      expect(result.points[0]!.date).toBe('2025-12-01');
      expect(result.points[0]!.totalBalance).toBe(50000);
      expect(result.points[0]!.totalLimit).toBe(200000);
      expect(result.points[0]!.utilizationPct).toBe(25);
    });

    it('returns empty when no credit limit data exists', () => {
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
          names: [
            {
              name_id: 'n1',
              full_name: 'Test',
              name_type: 'legal',
              source_import_id: 'imp_test_001',
            },
          ],
        },
      };
      ingestCreditFile(db, file);

      const result = getCreditUtilizationTrend(db, 'subj_test_001');
      expect(result.points).toHaveLength(0);
    });

    it('aggregates multiple tradelines per date', () => {
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
          names: [
            {
              name_id: 'n1',
              full_name: 'Test',
              name_type: 'legal',
              source_import_id: 'imp_test_001',
            },
          ],
        },
        tradelines: [
          {
            tradeline_id: 'tl_u1',
            account_type: 'credit_card',
            furnisher_name_raw: 'Test Bank',
            status_current: 'up_to_date',
            source_import_id: 'imp_test_001',
            snapshots: [
              {
                snapshot_id: 'snap_u1',
                as_of_date: '2025-12-01',
                current_balance: 30000,
                credit_limit: 100000,
                source_import_id: 'imp_test_001',
              },
            ],
          },
          {
            tradeline_id: 'tl_u2',
            account_type: 'credit_card',
            furnisher_name_raw: 'Test Bank',
            status_current: 'up_to_date',
            source_import_id: 'imp_test_001',
            snapshots: [
              {
                snapshot_id: 'snap_u2',
                as_of_date: '2025-12-01',
                current_balance: 20000,
                credit_limit: 50000,
                source_import_id: 'imp_test_001',
              },
            ],
          },
        ],
      };
      ingestCreditFile(db, file);

      const result = getCreditUtilizationTrend(db, 'subj_test_001');

      expect(result.points).toHaveLength(1);
      expect(result.points[0]!.totalBalance).toBe(50000);
      expect(result.points[0]!.totalLimit).toBe(150000);
      // 50000/150000 * 100 = 33.33
      expect(result.points[0]!.utilizationPct).toBeCloseTo(33.33, 1);
    });
  });

  describe('getScoreEventCorrelation', () => {
    it('returns score series and tradeline events', () => {
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
          names: [
            {
              name_id: 'n1',
              full_name: 'Test',
              name_type: 'legal',
              source_import_id: 'imp_test_001',
            },
          ],
        },
        organisations: [
          {
            organisation_id: 'org_1',
            name: 'Test Bank',
            roles: ['furnisher'],
            source_import_id: 'imp_test_001',
          },
        ],
        tradelines: [
          {
            tradeline_id: 'tl_evt_001',
            furnisher_organisation_id: 'org_1',
            account_type: 'credit_card',
            status_current: 'up_to_date',
            source_import_id: 'imp_test_001',
            events: [
              {
                event_id: 'evt_1',
                event_type: 'delinquency',
                event_date: '2025-11-15',
                source_import_id: 'imp_test_001',
              },
            ],
          },
        ],
        credit_scores: [
          {
            score_id: 'sc_1',
            score_type: 'credit_score',
            score_value: 720,
            calculated_at: '2025-11-01',
            source_import_id: 'imp_test_001',
          },
          {
            score_id: 'sc_2',
            score_type: 'credit_score',
            score_value: 700,
            calculated_at: '2025-12-01',
            source_import_id: 'imp_test_001',
          },
        ],
      };
      ingestCreditFile(db, file);

      const result = getScoreEventCorrelation(db, 'subj_test_001');

      expect(Object.keys(result.scoreSeries)).toContain('equifax');
      expect(result.scoreSeries['equifax']).toHaveLength(2);
      expect(result.events).toHaveLength(1);
      expect(result.events[0]!.eventType).toBe('delinquency');
      expect(result.events[0]!.furnisherName).toBe('Test Bank');
    });

    it('returns empty when no data exists', () => {
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
          names: [
            {
              name_id: 'n1',
              full_name: 'Test',
              name_type: 'legal',
              source_import_id: 'imp_test_001',
            },
          ],
        },
      };
      ingestCreditFile(db, file);

      const result = getScoreEventCorrelation(db, 'subj_test_001');
      expect(Object.keys(result.scoreSeries)).toHaveLength(0);
      expect(result.events).toHaveLength(0);
    });
  });

  describe('getPaymentPatternAnalysis', () => {
    it('categorizes payment statuses into on-time and late', () => {
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
          names: [
            {
              name_id: 'n1',
              full_name: 'Test',
              name_type: 'legal',
              source_import_id: 'imp_test_001',
            },
          ],
        },
        tradelines: [
          {
            tradeline_id: 'tl_pp_001',
            account_type: 'credit_card',
            furnisher_name_raw: 'Test Bank',
            status_current: 'up_to_date',
            source_import_id: 'imp_test_001',
            monthly_metrics: [
              {
                monthly_metric_id: 'mm_1',
                period: '2025-10',
                metric_type: 'payment_status',
                canonical_status: 'up_to_date',
                value_text: '0',
                source_import_id: 'imp_test_001',
              },
              {
                monthly_metric_id: 'mm_2',
                period: '2025-11',
                metric_type: 'payment_status',
                canonical_status: 'up_to_date',
                value_text: '0',
                source_import_id: 'imp_test_001',
              },
              {
                monthly_metric_id: 'mm_3',
                period: '2025-12',
                metric_type: 'payment_status',
                canonical_status: 'in_arrears',
                value_text: '1',
                source_import_id: 'imp_test_001',
              },
            ],
          },
        ],
      };
      ingestCreditFile(db, file);

      const result = getPaymentPatternAnalysis(db, 'subj_test_001');

      expect(result.periods).toHaveLength(3);
      const dec = result.periods.find((p) => p.period === '2025-12');
      expect(dec!.onTimeCount).toBe(0);
      expect(dec!.lateCount).toBe(1);

      const oct = result.periods.find((p) => p.period === '2025-10');
      expect(oct!.onTimeCount).toBe(1);
      expect(oct!.lateCount).toBe(0);
    });

    it('returns empty when no payment metrics exist', () => {
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
          names: [
            {
              name_id: 'n1',
              full_name: 'Test',
              name_type: 'legal',
              source_import_id: 'imp_test_001',
            },
          ],
        },
      };
      ingestCreditFile(db, file);

      const result = getPaymentPatternAnalysis(db, 'subj_test_001');
      expect(result.periods).toHaveLength(0);
    });
  });
});
