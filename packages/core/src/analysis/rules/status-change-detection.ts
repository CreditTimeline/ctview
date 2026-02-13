import { sql } from 'drizzle-orm';
import type { AnomalyRule, AnalysisContext, InsightResult } from '../types.js';
import type { InsightSeverity } from '../../types/enums.js';

/** Status severity bands for transition classification. */
const ACTIVE_STATUSES = new Set(['up_to_date', 'no_update', 'inactive']);
const ADVERSE_STATUSES = new Set([
  'in_arrears',
  'arrangement',
  'query',
  'gone_away',
  'default',
  'written_off',
  'repossession',
]);
const CLOSED_STATUSES = new Set(['settled', 'transferred']);

function classifyStatus(status: string): 'active' | 'adverse' | 'closed' | 'unknown' {
  if (ACTIVE_STATUSES.has(status)) return 'active';
  if (ADVERSE_STATUSES.has(status)) return 'adverse';
  if (CLOSED_STATUSES.has(status)) return 'closed';
  return 'unknown';
}

/**
 * Rule 5: Detects tradeline status transitions and credit score movements.
 *
 * 5a — Tradeline status: Compares latest two snapshots per tradeline.
 * 5b — Score movement: Compares two most recent scores per source_system.
 */
export const statusChangeDetection: AnomalyRule = {
  id: 'status_change_detection',
  name: 'Status Change Detection',
  evaluate(ctx: AnalysisContext): InsightResult[] {
    const results: InsightResult[] = [];
    results.push(...detectTradelineStatusChanges(ctx));
    results.push(...detectScoreMovements(ctx));
    return results;
  },
};

function detectTradelineStatusChanges(ctx: AnalysisContext): InsightResult[] {
  const { db, subjectId } = ctx;

  interface SnapshotRow {
    snapshot_id: string;
    tradeline_id: string;
    as_of_date: string | null;
    status_current: string | null;
  }

  const snapshots = db.all<SnapshotRow>(sql`
    SELECT ts.snapshot_id, ts.tradeline_id, ts.as_of_date,
           COALESCE(ts.status_current, t.status_current) AS status_current
    FROM tradeline_snapshot ts
    JOIN tradeline t ON ts.tradeline_id = t.tradeline_id
    WHERE t.subject_id = ${subjectId}
    ORDER BY ts.tradeline_id, ts.as_of_date ASC
  `);

  const byTradeline = new Map<string, SnapshotRow[]>();
  for (const s of snapshots) {
    const arr = byTradeline.get(s.tradeline_id) ?? [];
    arr.push(s);
    byTradeline.set(s.tradeline_id, arr);
  }

  const results: InsightResult[] = [];

  for (const [tradelineId, snaps] of byTradeline) {
    if (snaps.length < 2) continue;

    // Only compare the two most recent snapshots
    const prev = snaps[snaps.length - 2]!;
    const curr = snaps[snaps.length - 1]!;

    const prevStatus = prev.status_current ?? 'unknown';
    const currStatus = curr.status_current ?? 'unknown';

    if (prevStatus === currStatus) continue;

    const prevBand = classifyStatus(prevStatus);
    const currBand = classifyStatus(currStatus);

    if (prevBand === currBand) continue; // Same band, not a significant change

    let severity: InsightSeverity;
    let transitionType: string;

    if (prevBand === 'active' && currBand === 'adverse') {
      severity = 'high';
      transitionType = 'active_to_adverse';
    } else if (prevBand === 'adverse' && currBand === 'adverse') {
      // Shouldn't reach here due to band equality check, but just in case
      severity = 'medium';
      transitionType = 'adverse_worsening';
    } else if (prevBand === 'active' && currBand === 'closed') {
      severity = 'info';
      transitionType = 'active_to_closed';
    } else if (currBand === 'active' && (prevBand === 'adverse' || prevBand === 'closed')) {
      severity = 'info';
      transitionType = 'recovery';
    } else {
      severity = 'low';
      transitionType = `${prevBand}_to_${currBand}`;
    }

    results.push({
      kind: 'tradeline_status_change',
      severity,
      summary: `Tradeline ${tradelineId} status changed: "${prevStatus}" → "${currStatus}"`,
      entityIds: [tradelineId, prev.snapshot_id, curr.snapshot_id],
      extensions: {
        tradelineId,
        previousStatus: prevStatus,
        newStatus: currStatus,
        transitionType,
      },
    });
  }

  return results;
}

function detectScoreMovements(ctx: AnalysisContext): InsightResult[] {
  const { db, subjectId, config } = ctx;
  const threshold = config.scoreChange.threshold;

  interface ScoreRow {
    score_id: string;
    score_value: number | null;
    calculated_at: string | null;
    source_system: string;
  }

  const scores = db.all<ScoreRow>(sql`
    SELECT cs.score_id, cs.score_value, cs.calculated_at, cs.source_system
    FROM credit_score cs
    WHERE cs.subject_id = ${subjectId}
      AND cs.score_value IS NOT NULL
    ORDER BY cs.source_system, cs.calculated_at ASC
  `);

  const bySystem = new Map<string, ScoreRow[]>();
  for (const s of scores) {
    const arr = bySystem.get(s.source_system) ?? [];
    arr.push(s);
    bySystem.set(s.source_system, arr);
  }

  const results: InsightResult[] = [];

  for (const [sourceSystem, systemScores] of bySystem) {
    if (systemScores.length < 2) continue;

    const prev = systemScores[systemScores.length - 2]!;
    const curr = systemScores[systemScores.length - 1]!;

    const delta = curr.score_value! - prev.score_value!;
    const absDelta = Math.abs(delta);

    if (absDelta < threshold) continue;

    const direction = delta > 0 ? 'increase' : 'decrease';
    let severity: InsightSeverity;

    if (direction === 'increase') {
      severity = absDelta >= threshold * 2 ? 'low' : 'info';
    } else {
      // Drops scale by magnitude
      severity = absDelta >= threshold * 2 ? 'high' : absDelta >= threshold ? 'medium' : 'low';
    }

    results.push({
      kind: 'score_movement',
      severity,
      summary: `Credit score ${direction} of ${absDelta} points (${sourceSystem}): ${prev.score_value} → ${curr.score_value}`,
      entityIds: [prev.score_id, curr.score_id],
      extensions: {
        sourceSystem,
        previousValue: prev.score_value,
        currentValue: curr.score_value,
        delta,
        direction,
      },
    });
  }

  return results;
}
