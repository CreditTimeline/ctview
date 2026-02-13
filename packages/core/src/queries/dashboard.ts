import { sql } from 'drizzle-orm';
import type { AppDatabase } from '../db/client.js';
import { importBatch } from '../schema/sqlite/provenance.js';
import { ingestReceipt } from '../schema/sqlite/app.js';
import { parseJsonColumn } from './helpers.js';
import type { DashboardData, LatestScore, RecentImport, DebtSummary } from './types.js';

export function getDashboard(db: AppDatabase): DashboardData {
  return {
    counts: getEntityCounts(db),
    latestScores: getLatestScores(db),
    debtSummary: getDebtSummary(db),
    recentImports: getRecentImports(db),
  };
}

// ---------------------------------------------------------------------------

interface CountRow {
  count: number;
}

function getEntityCounts(db: AppDatabase) {
  const count = (table: string) =>
    db.all<CountRow>(sql.raw(`SELECT COUNT(*) as count FROM ${table}`))[0]?.count ?? 0;

  return {
    tradelines: count('tradeline'),
    imports: count('import_batch'),
    searches: count('search_record'),
    scores: count('credit_score'),
    publicRecords: count('public_record'),
    addresses: count('address'),
    fraudMarkers: count('fraud_marker'),
    disputes: count('dispute'),
    insights: count('generated_insight'),
  };
}

interface LatestScoreRow {
  score_id: string;
  source_system: string;
  score_value: number | null;
  score_min: number | null;
  score_max: number | null;
  score_band: string | null;
  calculated_at: string | null;
}

function getLatestScores(db: AppDatabase): LatestScore[] {
  const rows = db.all<LatestScoreRow>(sql`
    SELECT cs.score_id, cs.source_system, cs.score_value, cs.score_min,
           cs.score_max, cs.score_band, cs.calculated_at
    FROM credit_score cs
    INNER JOIN (
      SELECT source_system, MAX(calculated_at) AS max_date
      FROM credit_score
      GROUP BY source_system
    ) latest ON cs.source_system = latest.source_system
            AND cs.calculated_at = latest.max_date
  `);

  return rows.map((r) => ({
    scoreId: r.score_id,
    sourceSystem: r.source_system,
    scoreValue: r.score_value,
    scoreMin: r.score_min,
    scoreMax: r.score_max,
    scoreBand: r.score_band,
    calculatedAt: r.calculated_at,
  }));
}

interface DebtRow {
  total_balance: number | null;
  total_credit_limit: number | null;
  open_count: number;
}

function getDebtSummary(db: AppDatabase): DebtSummary {
  // For open tradelines (closed_at IS NULL), get the latest snapshot per tradeline
  const rows = db.all<DebtRow>(sql`
    SELECT
      COALESCE(SUM(snap.current_balance), 0) AS total_balance,
      COALESCE(SUM(snap.credit_limit), 0) AS total_credit_limit,
      COUNT(DISTINCT t.tradeline_id) AS open_count
    FROM tradeline t
    INNER JOIN (
      SELECT tradeline_id, current_balance, credit_limit,
             ROW_NUMBER() OVER (PARTITION BY tradeline_id ORDER BY as_of_date DESC) AS rn
      FROM tradeline_snapshot
    ) snap ON snap.tradeline_id = t.tradeline_id AND snap.rn = 1
    WHERE t.closed_at IS NULL
  `);

  const row = rows[0];
  return {
    totalBalance: row?.total_balance ?? 0,
    totalCreditLimit: row?.total_credit_limit ?? 0,
    openTradelineCount: row?.open_count ?? 0,
  };
}

function getRecentImports(db: AppDatabase): RecentImport[] {
  const rows = db
    .select({
      import_id: importBatch.import_id,
      imported_at: importBatch.imported_at,
      source_system: importBatch.source_system,
      acquisition_method: importBatch.acquisition_method,
      entity_counts_json: ingestReceipt.entity_counts_json,
    })
    .from(importBatch)
    .leftJoin(ingestReceipt, sql`${ingestReceipt.import_id} = ${importBatch.import_id}`)
    .orderBy(sql`${importBatch.imported_at} DESC`)
    .limit(10)
    .all();

  return rows.map((r) => ({
    importId: r.import_id,
    importedAt: r.imported_at,
    sourceSystem: r.source_system,
    acquisitionMethod: r.acquisition_method,
    entityCounts: parseJsonColumn<Record<string, number>>(r.entity_counts_json),
  }));
}
