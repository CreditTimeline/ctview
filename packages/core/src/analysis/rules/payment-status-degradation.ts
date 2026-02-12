import { sql } from 'drizzle-orm';
import type { AnomalyRule, AnalysisContext, InsightResult } from '../types.js';
import type { InsightSeverity } from '../../types/enums.js';

/** Status rank map — higher rank means worse status. */
const STATUS_RANK: Record<string, number> = {
  up_to_date: 1,
  no_update: 2,
  inactive: 2,
  arrangement: 3,
  in_arrears: 4,
  settled: 5,
  transferred: 5,
  query: 6,
  gone_away: 7,
  written_off: 8,
  default: 9,
  repossession: 10,
};

const SEVERE_STATUSES = new Set(['default', 'written_off', 'repossession']);

/**
 * Rule 2: Detects payment status degradation between consecutive snapshots.
 * Uses a status rank map to quantify worsening.
 */
export const paymentStatusDegradation: AnomalyRule = {
  id: 'payment_status_degradation',
  name: 'Payment Status Degradation',
  evaluate(ctx: AnalysisContext): InsightResult[] {
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

      for (let i = 1; i < snaps.length; i++) {
        const prev = snaps[i - 1]!;
        const curr = snaps[i]!;

        const prevStatus = prev.status_current ?? 'unknown';
        const currStatus = curr.status_current ?? 'unknown';

        const prevRank = STATUS_RANK[prevStatus] ?? 0;
        const currRank = STATUS_RANK[currStatus] ?? 0;
        const rankDelta = currRank - prevRank;

        if (rankDelta <= 0) continue; // Not a degradation

        let severity: InsightSeverity;
        if (SEVERE_STATUSES.has(currStatus) || rankDelta >= 6) {
          severity = 'high';
        } else if (rankDelta >= 3) {
          severity = 'medium';
        } else {
          severity = 'low';
        }

        results.push({
          kind: 'payment_status_degradation',
          severity,
          summary: `Payment status degraded from "${prevStatus}" to "${currStatus}" on tradeline ${tradelineId}`,
          entityIds: [prev.snapshot_id, curr.snapshot_id, tradelineId],
          extensions: {
            tradelineId,
            previousStatus: prevStatus,
            currentStatus: currStatus,
            rankDelta,
            snapshotDates: [prev.as_of_date, curr.as_of_date],
          },
        });
      }
    }

    return results;
  },
};
