import { sql, type SQL } from 'drizzle-orm';
import type { AppDatabase } from '../db/client.js';
import { paginate } from './helpers.js';
import type {
  InsightListParams,
  PaginatedResult,
  InsightSummary,
  SubjectAnomalyData,
} from './types.js';

function fetchLinkedEntities(db: AppDatabase, insightIds: string[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  if (insightIds.length === 0) return map;

  interface EntityRow {
    insight_id: string;
    entity_id: string;
  }

  const entityRows = db.all<EntityRow>(sql`
    SELECT insight_id, entity_id
    FROM generated_insight_entity
    WHERE insight_id IN ${insightIds}
  `);

  for (const e of entityRows) {
    if (!map.has(e.insight_id)) map.set(e.insight_id, []);
    map.get(e.insight_id)!.push(e.entity_id);
  }

  return map;
}

export function listInsights(
  db: AppDatabase,
  params: InsightListParams,
): PaginatedResult<InsightSummary> {
  const { limit, offset, subjectId, severity, kind } = params;

  const conditions: SQL[] = [];
  if (subjectId) conditions.push(sql`gi.subject_id = ${subjectId}`);
  if (severity) conditions.push(sql`gi.severity = ${severity}`);
  if (kind) conditions.push(sql`gi.kind = ${kind}`);

  const where = conditions.length > 0 ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``;

  interface Row {
    insight_id: string;
    kind: string;
    severity: string | null;
    summary: string | null;
    generated_at: string;
  }

  const rows = db.all<Row>(sql`
    SELECT gi.insight_id, gi.kind, gi.severity, gi.summary, gi.generated_at
    FROM generated_insight gi
    ${where}
    ORDER BY gi.generated_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `);

  const totalRow = db.all<{ count: number }>(sql`
    SELECT COUNT(*) as count FROM generated_insight gi ${where}
  `);
  const total = totalRow[0]?.count ?? 0;

  const entitiesByInsight = fetchLinkedEntities(
    db,
    rows.map((r) => r.insight_id),
  );

  const items: InsightSummary[] = rows.map((r) => ({
    insightId: r.insight_id,
    kind: r.kind,
    severity: r.severity,
    summary: r.summary,
    generatedAt: r.generated_at,
    linkedEntityIds: entitiesByInsight.get(r.insight_id) ?? [],
  }));

  return paginate(items, total, limit, offset);
}

export function getSubjectAnomalies(db: AppDatabase, subjectId: string): SubjectAnomalyData {
  interface SeverityRow {
    severity: string | null;
    count: number;
  }

  const severityRows = db.all<SeverityRow>(sql`
    SELECT severity, COUNT(*) AS count
    FROM generated_insight
    WHERE subject_id = ${subjectId}
    GROUP BY severity
  `);

  const countBySeverity: Record<string, number> = {};
  for (const r of severityRows) {
    countBySeverity[r.severity ?? 'unknown'] = r.count;
  }

  interface Row {
    insight_id: string;
    kind: string;
    severity: string | null;
    summary: string | null;
    generated_at: string;
  }

  const rows = db.all<Row>(sql`
    SELECT insight_id, kind, severity, summary, generated_at
    FROM generated_insight
    WHERE subject_id = ${subjectId}
    ORDER BY generated_at DESC
    LIMIT 20
  `);

  const entitiesByInsight = fetchLinkedEntities(
    db,
    rows.map((r) => r.insight_id),
  );

  const recentInsights: InsightSummary[] = rows.map((r) => ({
    insightId: r.insight_id,
    kind: r.kind,
    severity: r.severity,
    summary: r.summary,
    generatedAt: r.generated_at,
    linkedEntityIds: entitiesByInsight.get(r.insight_id) ?? [],
  }));

  return { countBySeverity, recentInsights };
}
