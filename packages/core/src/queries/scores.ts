import { sql, type SQL } from 'drizzle-orm';
import type { AppDatabase } from '../db/client.js';
import { parseJsonColumn, paginate } from './helpers.js';
import type {
  ScoreListParams,
  PaginatedResult,
  ScoreEntry,
  ScoreTrendData,
  ScoreTrendPoint,
} from './types.js';

export function listScores(
  db: AppDatabase,
  params: ScoreListParams,
): PaginatedResult<ScoreEntry> {
  const { limit, offset, subjectId, sourceSystem, from, to } = params;

  const conditions: SQL[] = [];
  if (subjectId) conditions.push(sql`cs.subject_id = ${subjectId}`);
  if (sourceSystem) conditions.push(sql`cs.source_system = ${sourceSystem}`);
  if (from) conditions.push(sql`cs.calculated_at >= ${from}`);
  if (to) conditions.push(sql`cs.calculated_at <= ${to}`);

  const where =
    conditions.length > 0 ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``;

  interface Row {
    score_id: string;
    score_type: string | null;
    score_name: string | null;
    score_value: number | null;
    score_min: number | null;
    score_max: number | null;
    score_band: string | null;
    calculated_at: string | null;
    source_system: string;
    score_factors_json: string | null;
  }

  const rows = db.all<Row>(sql`
    SELECT cs.score_id, cs.score_type, cs.score_name, cs.score_value,
           cs.score_min, cs.score_max, cs.score_band, cs.calculated_at,
           cs.source_system, cs.score_factors_json
    FROM credit_score cs
    ${where}
    ORDER BY cs.calculated_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `);

  const totalRow = db.all<{ count: number }>(sql`
    SELECT COUNT(*) as count FROM credit_score cs ${where}
  `);
  const total = totalRow[0]?.count ?? 0;

  const items: ScoreEntry[] = rows.map((r) => ({
    scoreId: r.score_id,
    scoreType: r.score_type,
    scoreName: r.score_name,
    scoreValue: r.score_value,
    scoreMin: r.score_min,
    scoreMax: r.score_max,
    scoreBand: r.score_band,
    calculatedAt: r.calculated_at,
    sourceSystem: r.source_system,
    scoreFactors: parseJsonColumn<string[]>(r.score_factors_json) ?? [],
  }));

  return paginate(items, total, limit, offset);
}

export function getScoreTrend(
  db: AppDatabase,
  subjectId: string,
): ScoreTrendData {
  interface Row {
    score_id: string;
    score_value: number | null;
    calculated_at: string | null;
    source_system: string;
  }

  const rows = db.all<Row>(sql`
    SELECT score_id, score_value, calculated_at, source_system
    FROM credit_score
    WHERE subject_id = ${subjectId}
    ORDER BY calculated_at ASC
  `);

  const series: Record<string, ScoreTrendPoint[]> = {};
  for (const r of rows) {
    if (!series[r.source_system]) {
      series[r.source_system] = [];
    }
    series[r.source_system].push({
      scoreId: r.score_id,
      scoreValue: r.score_value,
      calculatedAt: r.calculated_at,
      sourceSystem: r.source_system,
    });
  }

  return { series };
}
