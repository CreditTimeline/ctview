import { describe, it, expect } from 'vitest';
import { createTestDb } from '../../helpers/test-db.js';
import { ingestCreditFile } from '../../../ingestion/ingest-file.js';
import { statusChangeDetection } from '../../../analysis/rules/status-change-detection.js';
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

describe('Status Change Detection', () => {
  describe('Tradeline status changes', () => {
    it('detects active → adverse transition (high)', () => {
      const db = createTestDb();
      const file = {
        schema_version: '1.0.0',
        file_id: 'file_test_001',
        subject_id: 'subj_test_001',
        created_at: '2026-01-01T00:00:00Z',
        currency_code: 'GBP',
        imports: [{ import_id: 'imp_test_001', imported_at: '2026-01-01T00:00:00Z', source_system: 'equifax', acquisition_method: 'api' }],
        subject: { subject_id: 'subj_test_001', names: [{ name_id: 'n1', full_name: 'Test', name_type: 'legal', source_import_id: 'imp_test_001' }] },
        tradelines: [{
          tradeline_id: 'tl_sc_001',
          account_type: 'credit_card',
          furnisher_name_raw: 'Test Bank',
          status_current: 'default',
          source_import_id: 'imp_test_001',
          snapshots: [
            { snapshot_id: 'snap_1', as_of_date: '2025-11-01', status_current: 'up_to_date', source_import_id: 'imp_test_001' },
            { snapshot_id: 'snap_2', as_of_date: '2025-12-01', status_current: 'default', source_import_id: 'imp_test_001' },
          ],
        }],
      };
      ingestCreditFile(db, file);

      const results = statusChangeDetection.evaluate(buildCtx(db));
      const tradelineResults = results.filter((r) => r.kind === 'tradeline_status_change');

      expect(tradelineResults).toHaveLength(1);
      expect(tradelineResults[0]!.severity).toBe('high');
      expect(tradelineResults[0]!.extensions!.transitionType).toBe('active_to_adverse');
    });

    it('detects active → closed transition (info)', () => {
      const db = createTestDb();
      const file = {
        schema_version: '1.0.0',
        file_id: 'file_test_001',
        subject_id: 'subj_test_001',
        created_at: '2026-01-01T00:00:00Z',
        currency_code: 'GBP',
        imports: [{ import_id: 'imp_test_001', imported_at: '2026-01-01T00:00:00Z', source_system: 'equifax', acquisition_method: 'api' }],
        subject: { subject_id: 'subj_test_001', names: [{ name_id: 'n1', full_name: 'Test', name_type: 'legal', source_import_id: 'imp_test_001' }] },
        tradelines: [{
          tradeline_id: 'tl_sc_002',
          account_type: 'unsecured_loan',
          furnisher_name_raw: 'Test Bank',
          status_current: 'settled',
          source_import_id: 'imp_test_001',
          snapshots: [
            { snapshot_id: 'snap_3', as_of_date: '2025-11-01', status_current: 'up_to_date', source_import_id: 'imp_test_001' },
            { snapshot_id: 'snap_4', as_of_date: '2025-12-01', status_current: 'settled', source_import_id: 'imp_test_001' },
          ],
        }],
      };
      ingestCreditFile(db, file);

      const results = statusChangeDetection.evaluate(buildCtx(db));
      const tradelineResults = results.filter((r) => r.kind === 'tradeline_status_change');

      expect(tradelineResults).toHaveLength(1);
      expect(tradelineResults[0]!.severity).toBe('info');
      expect(tradelineResults[0]!.extensions!.transitionType).toBe('active_to_closed');
    });

    it('does not flag when status remains in the same band', () => {
      const db = createTestDb();
      const file = {
        schema_version: '1.0.0',
        file_id: 'file_test_001',
        subject_id: 'subj_test_001',
        created_at: '2026-01-01T00:00:00Z',
        currency_code: 'GBP',
        imports: [{ import_id: 'imp_test_001', imported_at: '2026-01-01T00:00:00Z', source_system: 'equifax', acquisition_method: 'api' }],
        subject: { subject_id: 'subj_test_001', names: [{ name_id: 'n1', full_name: 'Test', name_type: 'legal', source_import_id: 'imp_test_001' }] },
        tradelines: [{
          tradeline_id: 'tl_sc_003',
          account_type: 'credit_card',
          furnisher_name_raw: 'Test Bank',
          status_current: 'no_update',
          source_import_id: 'imp_test_001',
          snapshots: [
            { snapshot_id: 'snap_5', as_of_date: '2025-11-01', status_current: 'up_to_date', source_import_id: 'imp_test_001' },
            { snapshot_id: 'snap_6', as_of_date: '2025-12-01', status_current: 'no_update', source_import_id: 'imp_test_001' },
          ],
        }],
      };
      ingestCreditFile(db, file);

      const results = statusChangeDetection.evaluate(buildCtx(db));
      const tradelineResults = results.filter((r) => r.kind === 'tradeline_status_change');

      expect(tradelineResults).toHaveLength(0);
    });
  });

  describe('Score movements', () => {
    it('detects a large score drop (medium/high)', () => {
      const db = createTestDb();
      const file = {
        schema_version: '1.0.0',
        file_id: 'file_test_001',
        subject_id: 'subj_test_001',
        created_at: '2026-01-01T00:00:00Z',
        currency_code: 'GBP',
        imports: [{ import_id: 'imp_test_001', imported_at: '2026-01-01T00:00:00Z', source_system: 'equifax', acquisition_method: 'api' }],
        subject: { subject_id: 'subj_test_001', names: [{ name_id: 'n1', full_name: 'Test', name_type: 'legal', source_import_id: 'imp_test_001' }] },
        credit_scores: [
          { score_id: 'score_1', score_type: 'credit_score', score_value: 720, calculated_at: '2025-11-01', source_import_id: 'imp_test_001' },
          { score_id: 'score_2', score_type: 'credit_score', score_value: 650, calculated_at: '2025-12-01', source_import_id: 'imp_test_001' },
        ],
      };
      ingestCreditFile(db, file);

      const results = statusChangeDetection.evaluate(buildCtx(db));
      const scoreResults = results.filter((r) => r.kind === 'score_movement');

      expect(scoreResults).toHaveLength(1);
      expect(scoreResults[0]!.extensions!.direction).toBe('decrease');
      expect(scoreResults[0]!.extensions!.delta).toBe(-70);
      expect(['medium', 'high']).toContain(scoreResults[0]!.severity);
    });

    it('detects a large score increase (info/low)', () => {
      const db = createTestDb();
      const file = {
        schema_version: '1.0.0',
        file_id: 'file_test_001',
        subject_id: 'subj_test_001',
        created_at: '2026-01-01T00:00:00Z',
        currency_code: 'GBP',
        imports: [{ import_id: 'imp_test_001', imported_at: '2026-01-01T00:00:00Z', source_system: 'equifax', acquisition_method: 'api' }],
        subject: { subject_id: 'subj_test_001', names: [{ name_id: 'n1', full_name: 'Test', name_type: 'legal', source_import_id: 'imp_test_001' }] },
        credit_scores: [
          { score_id: 'score_3', score_type: 'credit_score', score_value: 650, calculated_at: '2025-11-01', source_import_id: 'imp_test_001' },
          { score_id: 'score_4', score_type: 'credit_score', score_value: 720, calculated_at: '2025-12-01', source_import_id: 'imp_test_001' },
        ],
      };
      ingestCreditFile(db, file);

      const results = statusChangeDetection.evaluate(buildCtx(db));
      const scoreResults = results.filter((r) => r.kind === 'score_movement');

      expect(scoreResults).toHaveLength(1);
      expect(scoreResults[0]!.extensions!.direction).toBe('increase');
      expect(['info', 'low']).toContain(scoreResults[0]!.severity);
    });

    it('does not flag small score changes', () => {
      const db = createTestDb();
      const file = {
        schema_version: '1.0.0',
        file_id: 'file_test_001',
        subject_id: 'subj_test_001',
        created_at: '2026-01-01T00:00:00Z',
        currency_code: 'GBP',
        imports: [{ import_id: 'imp_test_001', imported_at: '2026-01-01T00:00:00Z', source_system: 'equifax', acquisition_method: 'api' }],
        subject: { subject_id: 'subj_test_001', names: [{ name_id: 'n1', full_name: 'Test', name_type: 'legal', source_import_id: 'imp_test_001' }] },
        credit_scores: [
          { score_id: 'score_5', score_type: 'credit_score', score_value: 720, calculated_at: '2025-11-01', source_import_id: 'imp_test_001' },
          { score_id: 'score_6', score_type: 'credit_score', score_value: 730, calculated_at: '2025-12-01', source_import_id: 'imp_test_001' },
        ],
      };
      ingestCreditFile(db, file);

      const results = statusChangeDetection.evaluate(buildCtx(db));
      const scoreResults = results.filter((r) => r.kind === 'score_movement');

      expect(scoreResults).toHaveLength(0);
    });
  });
});
