import { sql } from 'drizzle-orm';
import type { AnomalyRule, AnalysisContext, InsightResult } from '../types.js';
import type { InsightSeverity } from '../../types/enums.js';

/**
 * Rule 1: Detects hard searches since the previous import.
 * - Cross-references search organisations against known tradeline furnishers.
 * - Severity scales with search count.
 */
export const hardSearchDetection: AnomalyRule = {
  id: 'hard_search_spike',
  name: 'Hard Search Detection',
  evaluate(ctx: AnalysisContext): InsightResult[] {
    const { db, subjectId, importIds, config } = ctx;
    const { burstThreshold, frequentThreshold, burstWindowDays } = config.hardSearch;

    // Find the previous import date to determine the lookback window
    interface ImportRow {
      import_id: string;
      imported_at: string;
    }
    const allImports = db.all<ImportRow>(sql`
      SELECT ib.import_id, ib.imported_at
      FROM import_batch ib
      JOIN credit_file cf ON ib.file_id = cf.file_id
      WHERE cf.subject_id = ${subjectId}
      ORDER BY ib.imported_at DESC
    `);

    // Find the most recent non-current import for date cutoff
    const currentImportDates = allImports
      .filter((i) => importIds.includes(i.import_id))
      .map((i) => i.imported_at);
    const latestImportDate = currentImportDates[0] ?? new Date().toISOString();

    // Calculate cutoff date from config window
    const cutoffDate = new Date(
      new Date(latestImportDate).getTime() - burstWindowDays * 24 * 60 * 60 * 1000,
    ).toISOString();

    // Previous import date (fallback to cutoff if no prior imports)
    const priorImport = allImports.find((i) => !importIds.includes(i.import_id));
    const sinceDate = priorImport ? priorImport.imported_at : cutoffDate;

    // Get hard searches since the reference date
    interface SearchRow {
      search_id: string;
      organisation_id: string | null;
      organisation_name: string | null;
      searched_at: string | null;
    }

    const hardSearches = db.all<SearchRow>(sql`
      SELECT sr.search_id, sr.organisation_id,
             COALESCE(o.name, sr.organisation_name_raw) AS organisation_name,
             sr.searched_at
      FROM search_record sr
      LEFT JOIN organisation o ON sr.organisation_id = o.organisation_id
      WHERE sr.subject_id = ${subjectId}
        AND sr.visibility = 'hard'
        AND sr.searched_at >= ${sinceDate}
    `);

    if (hardSearches.length === 0) return [];

    // Get known tradeline furnisher org IDs for cross-reference
    const knownFurnisherIds = new Set<string>();
    interface FurnisherRow {
      furnisher_organisation_id: string | null;
    }
    const furnishers = db.all<FurnisherRow>(sql`
      SELECT DISTINCT furnisher_organisation_id
      FROM tradeline
      WHERE subject_id = ${subjectId}
        AND furnisher_organisation_id IS NOT NULL
    `);
    for (const f of furnishers) {
      if (f.furnisher_organisation_id) knownFurnisherIds.add(f.furnisher_organisation_id);
    }

    // Build search details with known-lender classification
    const searchDetails = hardSearches.map((s) => ({
      searchId: s.search_id,
      organisationName: s.organisation_name,
      knownLender: s.organisation_id ? knownFurnisherIds.has(s.organisation_id) : false,
    }));

    const count = hardSearches.length;
    const unknownCount = searchDetails.filter((s) => !s.knownLender).length;
    const classification = unknownCount > 0 ? 'includes_unknown' : 'all_known';

    let severity: InsightSeverity;
    if (count >= burstThreshold) {
      severity = 'high';
    } else if (count >= frequentThreshold) {
      severity = 'medium';
    } else {
      severity = 'low';
    }

    return [
      {
        kind: 'hard_search_spike',
        severity,
        summary: `${count} hard search${count === 1 ? '' : 'es'} detected since last import (${classification})`,
        entityIds: hardSearches.map((s) => s.search_id),
        extensions: {
          searchCount: count,
          classification,
          searches: searchDetails,
        },
      },
    ];
  },
};
