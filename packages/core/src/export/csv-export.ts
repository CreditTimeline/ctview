/**
 * CSV export functions for tradelines, searches, and scores.
 * Uses RFC 4180 compliant CSV generation (no external library).
 */

import type { AppDatabase } from '../db/client.js';
import { listTradelines } from '../queries/tradelines.js';
import { listSearches } from '../queries/searches.js';
import { listScores } from '../queries/scores.js';

// ---------------------------------------------------------------------------
// RFC 4180 CSV helpers
// ---------------------------------------------------------------------------

/** Escape a single CSV field per RFC 4180 */
function escapeField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

/** Convert headers and rows to an RFC 4180 CSV string */
export function toCsv(headers: string[], rows: string[][]): string {
  const lines = [headers.map(escapeField).join(',')];
  for (const row of rows) {
    lines.push(row.map(escapeField).join(','));
  }
  return lines.join('\r\n') + '\r\n';
}

/** Convert a value to its string representation for CSV */
function str(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

// ---------------------------------------------------------------------------
// Export functions
// ---------------------------------------------------------------------------

export function exportTradelinesCsv(db: AppDatabase, subjectId: string): string {
  const result = listTradelines(db, { subjectId, limit: 10000, offset: 0 });

  const headers = [
    'tradeline_id',
    'canonical_id',
    'furnisher_name',
    'account_type',
    'opened_at',
    'closed_at',
    'status_current',
    'source_system',
    'latest_balance',
    'latest_credit_limit',
    'latest_snapshot_date',
  ];

  const rows = result.items.map((t) => [
    str(t.tradelineId),
    str(t.canonicalId),
    str(t.furnisherName),
    str(t.accountType),
    str(t.openedAt),
    str(t.closedAt),
    str(t.statusCurrent),
    str(t.sourceSystem),
    str(t.latestBalance),
    str(t.latestCreditLimit),
    str(t.latestSnapshotDate),
  ]);

  return toCsv(headers, rows);
}

export function exportSearchesCsv(db: AppDatabase, subjectId: string): string {
  const result = listSearches(db, { subjectId, limit: 10000, offset: 0 });

  const headers = [
    'search_id',
    'searched_at',
    'organisation_name',
    'search_type',
    'visibility',
    'purpose_text',
  ];

  const rows = result.items.map((s) => [
    str(s.searchId),
    str(s.searchedAt),
    str(s.organisationName),
    str(s.searchType),
    str(s.visibility),
    str(s.purposeText),
  ]);

  return toCsv(headers, rows);
}

export function exportScoresCsv(db: AppDatabase, subjectId: string): string {
  const result = listScores(db, { subjectId, limit: 10000, offset: 0 });

  const headers = [
    'score_id',
    'score_type',
    'score_name',
    'score_value',
    'score_min',
    'score_max',
    'score_band',
    'calculated_at',
    'source_system',
    'score_factors',
  ];

  const rows = result.items.map((s) => [
    str(s.scoreId),
    str(s.scoreType),
    str(s.scoreName),
    str(s.scoreValue),
    str(s.scoreMin),
    str(s.scoreMax),
    str(s.scoreBand),
    str(s.calculatedAt),
    str(s.sourceSystem),
    str(s.scoreFactors.join('; ')),
  ]);

  return toCsv(headers, rows);
}
