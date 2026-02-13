import { sql } from 'drizzle-orm';
import type { AnomalyRule, AnalysisContext, InsightResult } from '../types.js';

/**
 * Rule 4: Detects tradelines appearing for the first time in an import.
 * - Skips first-ever import (all tradelines are "new" — no historical baseline).
 * - Classifies as "expected" if opened within 90 days of import, "unexpected" otherwise.
 */
export const newTradelineDetection: AnomalyRule = {
  id: 'new_tradeline_detected',
  name: 'New Tradeline Detection',
  evaluate(ctx: AnalysisContext): InsightResult[] {
    const { db, importIds } = ctx;

    // Check if this is the first import for the subject — skip if so
    interface ImportRow {
      import_id: string;
      imported_at: string;
    }
    const allImports = db.all<ImportRow>(sql`
      SELECT ib.import_id, ib.imported_at
      FROM import_batch ib
      JOIN credit_file cf ON ib.file_id = cf.file_id
      WHERE cf.subject_id = ${ctx.subjectId}
      ORDER BY ib.imported_at ASC
    `);

    const priorImportIds = allImports
      .filter((i) => !importIds.includes(i.import_id))
      .map((i) => i.import_id);

    if (priorImportIds.length === 0) return [];

    // Get the latest import date for determining "recent" opens
    const currentImport = allImports.find((i) => importIds.includes(i.import_id));
    const importDate = currentImport?.imported_at ?? new Date().toISOString();

    // Find tradelines in current import that don't exist in prior imports
    interface TradelineRow {
      tradeline_id: string;
      canonical_id: string | null;
      account_type: string | null;
      opened_at: string | null;
      source_system: string;
      furnisher_name: string | null;
    }

    const currentTradelines = db.all<TradelineRow>(sql`
      SELECT t.tradeline_id, t.canonical_id, t.account_type, t.opened_at,
             t.source_system,
             COALESCE(o.name, t.furnisher_name_raw) AS furnisher_name
      FROM tradeline t
      LEFT JOIN organisation o ON t.furnisher_organisation_id = o.organisation_id
      WHERE t.source_import_id IN ${importIds}
    `);

    const priorTradelineIds = new Set<string>();
    const priorCanonicalIds = new Set<string>();

    interface PriorRow {
      tradeline_id: string;
      canonical_id: string | null;
    }
    const priorRows = db.all<PriorRow>(sql`
      SELECT tradeline_id, canonical_id
      FROM tradeline
      WHERE source_import_id IN ${priorImportIds}
    `);

    for (const r of priorRows) {
      priorTradelineIds.add(r.tradeline_id);
      if (r.canonical_id) priorCanonicalIds.add(r.canonical_id);
    }

    const newTradelines = currentTradelines.filter((t) => {
      if (priorTradelineIds.has(t.tradeline_id)) return false;
      if (t.canonical_id && priorCanonicalIds.has(t.canonical_id)) return false;
      return true;
    });

    if (newTradelines.length === 0) return [];

    const results: InsightResult[] = [];
    const unexpectedCount = { count: 0 };

    for (const t of newTradelines) {
      const classification = classifyNew(t.opened_at, importDate);
      if (classification === 'unexpected') unexpectedCount.count++;

      results.push({
        kind: 'new_tradeline_detected',
        severity: classification === 'expected' ? 'info' : 'low',
        summary:
          classification === 'expected'
            ? `New tradeline detected: ${t.account_type ?? 'unknown'} from ${t.furnisher_name ?? 'unknown'} (recently opened)`
            : `Unexpected new tradeline: ${t.account_type ?? 'unknown'} from ${t.furnisher_name ?? 'unknown'}`,
        entityIds: [t.tradeline_id],
        extensions: {
          tradelineId: t.tradeline_id,
          accountType: t.account_type,
          furnisherName: t.furnisher_name,
          openedAt: t.opened_at,
          classification,
        },
      });
    }

    // Upgrade severity if multiple unexpected in same import
    if (unexpectedCount.count > 1) {
      for (const r of results) {
        if (r.extensions?.classification === 'unexpected') {
          r.severity = 'medium';
        }
      }
    }

    return results;
  },
};

function classifyNew(openedAt: string | null, importDate: string): 'expected' | 'unexpected' {
  if (!openedAt) return 'unexpected';

  const opened = new Date(openedAt).getTime();
  const imported = new Date(importDate).getTime();
  const daysDiff = (imported - opened) / (1000 * 60 * 60 * 24);

  return daysDiff <= 90 ? 'expected' : 'unexpected';
}
