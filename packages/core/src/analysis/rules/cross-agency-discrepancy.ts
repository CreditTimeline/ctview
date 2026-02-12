import { sql } from 'drizzle-orm';
import type { AnomalyRule, AnalysisContext, InsightResult } from '../types.js';
import type { InsightSeverity } from '../../types/enums.js';

interface TradelineWithSnapshot {
  tradeline_id: string;
  canonical_id: string;
  source_system: string;
  status_current: string | null;
  current_balance: number | null;
  credit_limit: number | null;
}

interface Discrepancy {
  field: string;
  agencyA: string;
  valueA: unknown;
  agencyB: string;
  valueB: unknown;
  pctDifference?: number;
}

/**
 * Rule 6: Compares tradeline data reported by different agencies for the same
 * account (matched via canonical_id). Flags material differences.
 */
export const crossAgencyDiscrepancy: AnomalyRule = {
  id: 'cross_agency_discrepancy',
  name: 'Cross-Agency Discrepancy Detection',
  evaluate(ctx: AnalysisContext): InsightResult[] {
    const { db, subjectId, config } = ctx;

    // Get tradelines with canonical_id and their latest snapshot
    const rows = db.all<TradelineWithSnapshot>(sql`
      SELECT t.tradeline_id, t.canonical_id, t.source_system,
             t.status_current,
             ts.current_balance, ts.credit_limit
      FROM tradeline t
      LEFT JOIN (
        SELECT ts1.tradeline_id, ts1.current_balance, ts1.credit_limit
        FROM tradeline_snapshot ts1
        INNER JOIN (
          SELECT tradeline_id, MAX(as_of_date) AS max_date
          FROM tradeline_snapshot
          GROUP BY tradeline_id
        ) ts2 ON ts1.tradeline_id = ts2.tradeline_id AND ts1.as_of_date = ts2.max_date
      ) ts ON t.tradeline_id = ts.tradeline_id
      WHERE t.subject_id = ${subjectId}
        AND t.canonical_id IS NOT NULL
    `);

    // Group by canonical_id
    const byCanonical = new Map<string, TradelineWithSnapshot[]>();
    for (const r of rows) {
      const arr = byCanonical.get(r.canonical_id) ?? [];
      arr.push(r);
      byCanonical.set(r.canonical_id, arr);
    }

    const results: InsightResult[] = [];

    for (const [canonicalId, group] of byCanonical) {
      // Need 2+ tradelines from different agencies
      const agencies = new Set(group.map((t) => t.source_system));
      if (agencies.size < 2) continue;

      const discrepancies: Discrepancy[] = [];
      let maxSeverity: InsightSeverity = 'low';

      // Compare pairs
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const a = group[i]!;
          const b = group[j]!;
          if (a.source_system === b.source_system) continue;

          // Balance comparison
          if (a.current_balance != null && b.current_balance != null) {
            const pctDiff = computePctDiff(a.current_balance, b.current_balance);
            if (pctDiff >= config.crossAgency.balancePctThreshold) {
              discrepancies.push({
                field: 'balance',
                agencyA: a.source_system,
                valueA: a.current_balance,
                agencyB: b.source_system,
                valueB: b.current_balance,
                pctDifference: Math.round(pctDiff * 100) / 100,
              });
              if (pctDiff > 25) maxSeverity = bumpSeverity(maxSeverity, 'medium');
            }
          }

          // Limit comparison
          if (a.credit_limit != null && b.credit_limit != null) {
            const pctDiff = computePctDiff(a.credit_limit, b.credit_limit);
            if (pctDiff >= config.crossAgency.limitPctThreshold) {
              discrepancies.push({
                field: 'limit',
                agencyA: a.source_system,
                valueA: a.credit_limit,
                agencyB: b.source_system,
                valueB: b.credit_limit,
                pctDifference: Math.round(pctDiff * 100) / 100,
              });
              if (pctDiff > 25) maxSeverity = bumpSeverity(maxSeverity, 'medium');
            }
          }

          // Status comparison
          if (a.status_current && b.status_current && a.status_current !== b.status_current) {
            discrepancies.push({
              field: 'status',
              agencyA: a.source_system,
              valueA: a.status_current,
              agencyB: b.source_system,
              valueB: b.status_current,
            });
            maxSeverity = bumpSeverity(maxSeverity, 'high');
          }
        }
      }

      if (discrepancies.length === 0) continue;

      results.push({
        kind: 'cross_agency_discrepancy',
        severity: maxSeverity,
        summary: `Cross-agency discrepancy for canonical tradeline ${canonicalId}: ${discrepancies.length} field${discrepancies.length === 1 ? '' : 's'} differ`,
        entityIds: group.map((t) => t.tradeline_id),
        extensions: {
          canonicalId,
          discrepancies,
        },
      });
    }

    return results;
  },
};

function computePctDiff(a: number, b: number): number {
  const max = Math.max(Math.abs(a), Math.abs(b), 1);
  return (Math.abs(a - b) / max) * 100;
}

const SEVERITY_ORDER: InsightSeverity[] = ['info', 'low', 'medium', 'high'];

function bumpSeverity(current: InsightSeverity, candidate: InsightSeverity): InsightSeverity {
  return SEVERITY_ORDER.indexOf(candidate) > SEVERITY_ORDER.indexOf(current) ? candidate : current;
}
