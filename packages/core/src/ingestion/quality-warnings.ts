import type { CreditFile } from '../types/canonical.js';
import type { InsightSeverity } from '../types/enums.js';

export interface QualityWarning {
  kind: string;
  severity: InsightSeverity;
  summary: string;
  entityIds?: string[];
}

/**
 * Generates non-fatal quality warnings for a validated credit file.
 * These are returned in the API response AND stored as generated_insight records.
 */
export function generateQualityWarnings(file: CreditFile): QualityWarning[] {
  const warnings: QualityWarning[] = [];

  // Sparse file: subject exists but no tradelines
  if (!file.tradelines?.length) {
    warnings.push({
      kind: 'sparse_file',
      severity: 'info',
      summary: 'Credit file contains no tradelines',
    });
  }

  for (const t of file.tradelines ?? []) {
    // Missing snapshots
    if (!t.snapshots?.length) {
      warnings.push({
        kind: 'missing_snapshots',
        severity: 'info',
        summary: `Tradeline ${t.tradeline_id} has no snapshots`,
        entityIds: [t.tradeline_id],
      });
    }

    // Missing monthly metrics
    if (!t.monthly_metrics?.length) {
      warnings.push({
        kind: 'missing_metrics',
        severity: 'info',
        summary: `Tradeline ${t.tradeline_id} has no monthly metrics`,
        entityIds: [t.tradeline_id],
      });
    }

    // Negative balance in snapshots
    for (const s of t.snapshots ?? []) {
      if (s.current_balance !== undefined && s.current_balance < 0) {
        warnings.push({
          kind: 'negative_balance',
          severity: 'low',
          summary: `Tradeline ${t.tradeline_id} snapshot ${s.snapshot_id} has negative balance (${s.current_balance})`,
          entityIds: [t.tradeline_id, s.snapshot_id],
        });
      }
    }

    // Zero credit limit on credit-bearing accounts
    const creditTypes = new Set(['credit_card', 'mortgage', 'secured_loan', 'unsecured_loan']);
    if (t.account_type && creditTypes.has(t.account_type)) {
      for (const s of t.snapshots ?? []) {
        if (s.credit_limit === 0) {
          warnings.push({
            kind: 'zero_credit_limit',
            severity: 'info',
            summary: `Tradeline ${t.tradeline_id} (${t.account_type}) has zero credit limit`,
            entityIds: [t.tradeline_id],
          });
          break; // Only warn once per tradeline
        }
      }
    }
  }

  // Duplicate-looking tradelines (same account_type + furnisher)
  const tradelineSignatures = new Map<string, string[]>();
  for (const t of file.tradelines ?? []) {
    const key = `${t.account_type ?? 'unknown'}|${t.furnisher_organisation_id ?? t.furnisher_name_raw ?? 'unknown'}`;
    const ids = tradelineSignatures.get(key) ?? [];
    ids.push(t.tradeline_id);
    tradelineSignatures.set(key, ids);
  }
  for (const [, ids] of tradelineSignatures) {
    if (ids.length > 1) {
      warnings.push({
        kind: 'duplicate_looking_tradeline',
        severity: 'low',
        summary: `${ids.length} tradelines share the same account type and furnisher`,
        entityIds: ids,
      });
    }
  }

  return warnings;
}
