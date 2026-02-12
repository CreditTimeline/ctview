import { sql } from 'drizzle-orm';
import type { AnomalyRule, AnalysisContext, InsightResult } from '../types.js';

/**
 * Rule 3: Detects unexpected balance changes between consecutive tradeline snapshots.
 * Flags if % change >= threshold AND absolute change >= minimum.
 */
export const balanceChangeDetection: AnomalyRule = {
  id: 'unexpected_balance_change',
  name: 'Unexpected Balance Change Detection',
  evaluate(ctx: AnalysisContext): InsightResult[] {
    const { db, subjectId, config } = ctx;
    const { pctThreshold, absMinimum } = config.balanceChange;

    interface SnapshotRow {
      snapshot_id: string;
      tradeline_id: string;
      as_of_date: string | null;
      current_balance: number | null;
    }

    const snapshots = db.all<SnapshotRow>(sql`
      SELECT ts.snapshot_id, ts.tradeline_id, ts.as_of_date, ts.current_balance
      FROM tradeline_snapshot ts
      JOIN tradeline t ON ts.tradeline_id = t.tradeline_id
      WHERE t.subject_id = ${subjectId}
        AND ts.current_balance IS NOT NULL
      ORDER BY ts.tradeline_id, ts.as_of_date ASC
    `);

    // Group by tradeline
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

        const oldBal = prev.current_balance!;
        const newBal = curr.current_balance!;
        const absDelta = Math.abs(newBal - oldBal);
        const divisor = Math.max(Math.abs(oldBal), 1);
        const pctChange = (absDelta / divisor) * 100;

        if (pctChange >= pctThreshold && absDelta >= absMinimum) {
          const direction = newBal > oldBal ? 'increase' : 'decrease';
          const severity = pctChange >= 100 ? 'high' : pctChange >= 50 ? 'medium' : 'low';

          results.push({
            kind: 'unexpected_balance_change',
            severity,
            summary: `Balance ${direction} of ${pctChange.toFixed(0)}% on tradeline ${tradelineId} (${oldBal} → ${newBal})`,
            entityIds: [prev.snapshot_id, curr.snapshot_id, tradelineId],
            extensions: {
              tradelineId,
              direction,
              balanceOld: oldBal,
              balanceNew: newBal,
              absoluteChange: absDelta,
              pctChange: Math.round(pctChange * 100) / 100,
            },
          });
        }
      }
    }

    return results;
  },
};
