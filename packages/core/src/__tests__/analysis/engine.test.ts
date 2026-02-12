import { describe, it, expect } from 'vitest';
import { createTestDb } from '../helpers/test-db.js';
import { buildMinimalCreditFile } from '../helpers/fixtures.js';
import { createMockLogger } from '../helpers/mock-logger.js';
import { ingestCreditFile } from '../../ingestion/ingest-file.js';
import { runAnomalyRules } from '../../analysis/engine.js';
import { DEFAULT_CONFIG } from '../../analysis/config.js';
import type { AnalysisContext, AnomalyRule } from '../../analysis/types.js';
import { sql } from 'drizzle-orm';

function buildContext(db: ReturnType<typeof createTestDb>): AnalysisContext {
  return {
    db: db as AnalysisContext['db'],
    file: buildMinimalCreditFile() as AnalysisContext['file'],
    subjectId: 'subj_test_001',
    importIds: ['imp_test_001'],
    sourceSystemByImportId: new Map([['imp_test_001', 'equifax']]),
    config: DEFAULT_CONFIG,
  };
}

describe('Analysis Engine', () => {
  it('returns zero insights when no rules are provided', () => {
    const db = createTestDb();
    const ctx = buildContext(db);
    const result = runAnomalyRules(ctx, []);

    expect(result.insightCount).toBe(0);
    expect(result.ruleErrors).toHaveLength(0);
  });

  it('collects results from multiple mock rules', () => {
    const db = createTestDb();
    // Ingest so subject exists
    ingestCreditFile(db, buildMinimalCreditFile());
    const ctx = buildContext(db);

    const ruleA: AnomalyRule = {
      id: 'test_rule_a',
      name: 'Test Rule A',
      evaluate: () => [
        { kind: 'test_a', severity: 'info', summary: 'Info A' },
      ],
    };
    const ruleB: AnomalyRule = {
      id: 'test_rule_b',
      name: 'Test Rule B',
      evaluate: () => [
        { kind: 'test_b', severity: 'medium', summary: 'Medium B', entityIds: ['ent1'] },
        { kind: 'test_b2', severity: 'high', summary: 'High B2' },
      ],
    };

    const result = runAnomalyRules(ctx, [ruleA, ruleB]);

    expect(result.insightCount).toBe(3);
    expect(result.ruleErrors).toHaveLength(0);

    // Verify persisted
    const rows = db.all<{ kind: string }>(sql`
      SELECT kind FROM generated_insight WHERE subject_id = 'subj_test_001'
    `);
    const kinds = rows.map((r) => r.kind);
    expect(kinds).toContain('test_a');
    expect(kinds).toContain('test_b');
    expect(kinds).toContain('test_b2');
  });

  it('isolates rule errors without affecting other rules', () => {
    const db = createTestDb();
    ingestCreditFile(db, buildMinimalCreditFile());
    const mockLog = createMockLogger();
    const ctx = { ...buildContext(db), logger: mockLog };

    const goodRule: AnomalyRule = {
      id: 'good_rule',
      name: 'Good Rule',
      evaluate: () => [{ kind: 'good', severity: 'info', summary: 'Good' }],
    };
    const badRule: AnomalyRule = {
      id: 'bad_rule',
      name: 'Bad Rule',
      evaluate: () => {
        throw new Error('Rule exploded');
      },
    };

    const result = runAnomalyRules(ctx, [badRule, goodRule]);

    expect(result.insightCount).toBe(1);
    expect(result.ruleErrors).toHaveLength(1);
    expect(result.ruleErrors[0]!.ruleId).toBe('bad_rule');
    expect(result.ruleErrors[0]!.error).toBe('Rule exploded');

    // Verify structured warning was logged
    const warns = mockLog.calls.filter((c) => c.level === 'warn');
    expect(warns).toHaveLength(1);
    expect(warns[0]!.args[0]).toEqual(
      expect.objectContaining({ ruleId: 'bad_rule', error: 'Rule exploded' }),
    );
  });

  it('persists entity links for insights with entityIds', () => {
    const db = createTestDb();
    ingestCreditFile(db, buildMinimalCreditFile());
    const ctx = buildContext(db);

    const rule: AnomalyRule = {
      id: 'entity_rule',
      name: 'Entity Rule',
      evaluate: () => [
        {
          kind: 'with_entities',
          severity: 'low',
          summary: 'Has entities',
          entityIds: ['ent_1', 'ent_2', 'ent_3'],
        },
      ],
    };

    runAnomalyRules(ctx, [rule]);

    const entityRows = db.all<{ entity_id: string }>(sql`
      SELECT gie.entity_id
      FROM generated_insight_entity gie
      JOIN generated_insight gi ON gie.insight_id = gi.insight_id
      WHERE gi.kind = 'with_entities'
    `);

    expect(entityRows.map((r) => r.entity_id).sort()).toEqual(['ent_1', 'ent_2', 'ent_3']);
  });

  it('persists extensions_json when provided', () => {
    const db = createTestDb();
    ingestCreditFile(db, buildMinimalCreditFile());
    const ctx = buildContext(db);

    const rule: AnomalyRule = {
      id: 'ext_rule',
      name: 'Extensions Rule',
      evaluate: () => [
        {
          kind: 'with_ext',
          severity: 'info',
          summary: 'Has extensions',
          extensions: { foo: 'bar', count: 42 },
        },
      ],
    };

    runAnomalyRules(ctx, [rule]);

    const row = db.all<{ extensions_json: string | null }>(sql`
      SELECT extensions_json FROM generated_insight WHERE kind = 'with_ext'
    `);

    expect(row).toHaveLength(1);
    const parsed = JSON.parse(row[0]!.extensions_json!);
    expect(parsed).toEqual({ foo: 'bar', count: 42 });
  });
});
