import { nanoid } from 'nanoid';
import { generatedInsight, generatedInsightEntity } from '../schema/sqlite/index.js';
import { noopLogger } from '../logger.js';
import type { AnalysisContext, AnomalyRule, InsightResult, AnalysisEngineResult } from './types.js';

/**
 * Runs all anomaly rules against the analysis context.
 * Each rule is wrapped in try/catch — a failing rule logs a warning
 * but does not abort the transaction or other rules.
 */
export function runAnomalyRules(ctx: AnalysisContext, rules: AnomalyRule[]): AnalysisEngineResult {
  const log = ctx.logger ?? noopLogger;
  const allInsights: InsightResult[] = [];
  const ruleErrors: { ruleId: string; error: string }[] = [];

  for (const rule of rules) {
    try {
      const results = rule.evaluate(ctx);
      allInsights.push(...results);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      ruleErrors.push({ ruleId: rule.id, error: message });
      log.warn({ ruleId: rule.id, error: message }, 'anomaly rule failed');
    }
  }

  persistInsights(ctx, allInsights);

  return {
    insightCount: allInsights.length,
    ruleErrors,
  };
}

/**
 * Persists insight results as generated_insight + generated_insight_entity rows.
 */
function persistInsights(ctx: AnalysisContext, insights: InsightResult[]): void {
  if (!insights.length) return;

  for (const insight of insights) {
    const insightId = nanoid();
    ctx.db
      .insert(generatedInsight)
      .values({
        insight_id: insightId,
        subject_id: ctx.subjectId,
        kind: insight.kind,
        severity: insight.severity,
        summary: insight.summary,
        generated_at: new Date().toISOString(),
        extensions_json: insight.extensions ? JSON.stringify(insight.extensions) : null,
      })
      .run();

    for (const entityId of insight.entityIds ?? []) {
      ctx.db
        .insert(generatedInsightEntity)
        .values({
          insight_id: insightId,
          entity_id: entityId,
        })
        .run();
    }
  }
}
