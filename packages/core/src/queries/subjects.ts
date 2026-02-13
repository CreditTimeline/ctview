import { sql, eq, count } from 'drizzle-orm';
import type { AppDatabase } from '../db/client.js';
import { subject, importBatch } from '../schema/sqlite/provenance.js';
import { personName } from '../schema/sqlite/identity.js';
import { tradeline } from '../schema/sqlite/tradelines.js';
import { publicRecord, fraudMarker, generatedInsight } from '../schema/sqlite/records.js';
import { paginate } from './helpers.js';
import type {
  PaginationParams,
  PaginatedResult,
  SubjectListItem,
  SubjectSummary,
  LatestScore,
} from './types.js';

export function listSubjects(
  db: AppDatabase,
  params: PaginationParams,
): PaginatedResult<SubjectListItem> {
  const { limit, offset } = params;

  interface Row {
    subject_id: string;
    created_at: string;
    primary_name: string | null;
    tradeline_count: number;
    latest_import_at: string | null;
  }

  const rows = db.all<Row>(sql`
    SELECT
      s.subject_id,
      s.created_at,
      pn.full_name AS primary_name,
      COALESCE(tc.cnt, 0) AS tradeline_count,
      ib.latest_import_at
    FROM subject s
    LEFT JOIN person_name pn ON pn.subject_id = s.subject_id AND pn.name_type = 'legal'
    LEFT JOIN (
      SELECT subject_id, COUNT(*) AS cnt FROM tradeline GROUP BY subject_id
    ) tc ON tc.subject_id = s.subject_id
    LEFT JOIN (
      SELECT subject_id, MAX(imported_at) AS latest_import_at
      FROM import_batch GROUP BY subject_id
    ) ib ON ib.subject_id = s.subject_id
    ORDER BY s.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `);

  const totalRow = db.all<{ count: number }>(sql`SELECT COUNT(*) as count FROM subject`);
  const total = totalRow[0]?.count ?? 0;

  const items: SubjectListItem[] = rows.map((r) => ({
    subjectId: r.subject_id,
    createdAt: r.created_at,
    primaryName: r.primary_name,
    tradelineCount: r.tradeline_count,
    latestImportAt: r.latest_import_at,
  }));

  return paginate(items, total, limit, offset);
}

export function getSubjectSummary(db: AppDatabase, subjectId: string): SubjectSummary | null {
  // Check subject exists
  const subj = db.select().from(subject).where(eq(subject.subject_id, subjectId)).get();
  if (!subj) return null;

  // Names
  const names = db
    .select({
      nameId: personName.name_id,
      fullName: personName.full_name,
      nameType: personName.name_type,
    })
    .from(personName)
    .where(eq(personName.subject_id, subjectId))
    .all();

  // Active / closed tradeline counts
  const activeTl = db
    .select({ count: count() })
    .from(tradeline)
    .where(sql`${tradeline.subject_id} = ${subjectId} AND ${tradeline.closed_at} IS NULL`)
    .get();
  const closedTl = db
    .select({ count: count() })
    .from(tradeline)
    .where(sql`${tradeline.subject_id} = ${subjectId} AND ${tradeline.closed_at} IS NOT NULL`)
    .get();

  // Public record count
  const prCount = db
    .select({ count: count() })
    .from(publicRecord)
    .where(eq(publicRecord.subject_id, subjectId))
    .get();

  // Fraud marker count
  const fmCount = db
    .select({ count: count() })
    .from(fraudMarker)
    .where(eq(fraudMarker.subject_id, subjectId))
    .get();

  // Latest scores per agency
  interface ScoreRow {
    score_id: string;
    source_system: string;
    score_value: number | null;
    score_min: number | null;
    score_max: number | null;
    score_band: string | null;
    calculated_at: string | null;
  }
  const scores = db.all<ScoreRow>(sql`
    SELECT cs.score_id, cs.source_system, cs.score_value, cs.score_min,
           cs.score_max, cs.score_band, cs.calculated_at
    FROM credit_score cs
    INNER JOIN (
      SELECT source_system, MAX(calculated_at) AS max_date
      FROM credit_score
      WHERE subject_id = ${subjectId}
      GROUP BY source_system
    ) latest ON cs.source_system = latest.source_system
            AND cs.calculated_at = latest.max_date
    WHERE cs.subject_id = ${subjectId}
  `);

  // Last import date
  const lastImport = db
    .select({ importedAt: importBatch.imported_at })
    .from(importBatch)
    .where(eq(importBatch.subject_id, subjectId))
    .orderBy(sql`${importBatch.imported_at} DESC`)
    .limit(1)
    .get();

  // Insight count
  const insCount = db
    .select({ count: count() })
    .from(generatedInsight)
    .where(eq(generatedInsight.subject_id, subjectId))
    .get();

  const latestScores: LatestScore[] = scores.map((r) => ({
    scoreId: r.score_id,
    sourceSystem: r.source_system,
    scoreValue: r.score_value,
    scoreMin: r.score_min,
    scoreMax: r.score_max,
    scoreBand: r.score_band,
    calculatedAt: r.calculated_at,
  }));

  return {
    subjectId: subj.subject_id,
    createdAt: subj.created_at,
    names: names.map((n) => ({
      nameId: n.nameId,
      fullName: n.fullName,
      nameType: n.nameType,
    })),
    activeTradelineCount: activeTl?.count ?? 0,
    closedTradelineCount: closedTl?.count ?? 0,
    publicRecordCount: prCount?.count ?? 0,
    fraudMarkerCount: fmCount?.count ?? 0,
    latestScores,
    lastImportAt: lastImport?.importedAt ?? null,
    insightCount: insCount?.count ?? 0,
  };
}
