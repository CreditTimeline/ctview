import { nanoid } from 'nanoid';
import { generatedInsight, generatedInsightEntity } from '../../schema/sqlite/index.js';
import type { IngestContext } from '../ingest-context.js';
import type { QualityWarning } from '../quality-warnings.js';

/**
 * Persists quality warnings as generated_insight + generated_insight_entity rows.
 * Each warning becomes one insight row, with linked entity IDs stored in the junction table.
 */
export function insertQualityWarnings(ctx: IngestContext, warnings: QualityWarning[]): void {
  if (!warnings.length) return;

  for (const w of warnings) {
    const insightId = nanoid();
    ctx.tx
      .insert(generatedInsight)
      .values({
        insight_id: insightId,
        subject_id: ctx.subjectId,
        kind: w.kind,
        severity: w.severity,
        summary: w.summary,
        generated_at: new Date().toISOString(),
      })
      .run();

    for (const entityId of w.entityIds ?? []) {
      ctx.tx
        .insert(generatedInsightEntity)
        .values({
          insight_id: insightId,
          entity_id: entityId,
        })
        .run();
    }
  }
  ctx.entityCounts.generated_insights = warnings.length;
}
