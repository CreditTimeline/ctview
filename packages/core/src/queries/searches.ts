import { sql, type SQL } from 'drizzle-orm';
import type { AppDatabase } from '../db/client.js';
import { paginate } from './helpers.js';
import type {
  SearchListParams,
  PaginatedResult,
  SearchSummary,
  SearchTimelineData,
  SearchTimelineBucket,
  SearchFrequencyData,
} from './types.js';

export function listSearches(
  db: AppDatabase,
  params: SearchListParams,
): PaginatedResult<SearchSummary> {
  const { limit, offset, subjectId, visibility, searchType, from, to } = params;

  const conditions: SQL[] = [];
  if (subjectId) conditions.push(sql`sr.subject_id = ${subjectId}`);
  if (visibility) conditions.push(sql`sr.visibility = ${visibility}`);
  if (searchType) conditions.push(sql`sr.search_type = ${searchType}`);
  if (from) conditions.push(sql`sr.searched_at >= ${from}`);
  if (to) conditions.push(sql`sr.searched_at <= ${to}`);

  const where =
    conditions.length > 0 ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``;

  interface Row {
    search_id: string;
    searched_at: string | null;
    organisation_name: string | null;
    search_type: string | null;
    visibility: string | null;
    purpose_text: string | null;
  }

  const rows = db.all<Row>(sql`
    SELECT
      sr.search_id,
      sr.searched_at,
      COALESCE(o.name, sr.organisation_name_raw) AS organisation_name,
      sr.search_type,
      sr.visibility,
      sr.purpose_text
    FROM search_record sr
    LEFT JOIN organisation o ON o.organisation_id = sr.organisation_id
    ${where}
    ORDER BY sr.searched_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `);

  const totalRow = db.all<{ count: number }>(sql`
    SELECT COUNT(*) as count FROM search_record sr ${where}
  `);
  const total = totalRow[0]?.count ?? 0;

  const items: SearchSummary[] = rows.map((r) => ({
    searchId: r.search_id,
    searchedAt: r.searched_at,
    organisationName: r.organisation_name,
    searchType: r.search_type,
    visibility: r.visibility,
    purposeText: r.purpose_text,
  }));

  return paginate(items, total, limit, offset);
}

export function getSearchTimeline(
  db: AppDatabase,
  subjectId: string,
): SearchTimelineData {
  interface Row {
    month: string;
    visibility: string | null;
    count: number;
  }

  const rows = db.all<Row>(sql`
    SELECT
      substr(searched_at, 1, 7) AS month,
      visibility,
      COUNT(*) AS count
    FROM search_record
    WHERE subject_id = ${subjectId}
      AND searched_at IS NOT NULL
    GROUP BY substr(searched_at, 1, 7), visibility
    ORDER BY month ASC
  `);

  const hardSearches: SearchTimelineBucket[] = [];
  const softSearches: SearchTimelineBucket[] = [];

  for (const r of rows) {
    const bucket = { month: r.month, count: r.count };
    if (r.visibility === 'hard') {
      hardSearches.push(bucket);
    } else {
      softSearches.push(bucket);
    }
  }

  return { hardSearches, softSearches };
}

export function getSearchFrequency(
  db: AppDatabase,
  subjectId: string,
): SearchFrequencyData {
  interface Row {
    organisation_name: string | null;
    search_type: string | null;
    count: number;
  }

  const rows = db.all<Row>(sql`
    SELECT
      COALESCE(o.name, sr.organisation_name_raw) AS organisation_name,
      sr.search_type,
      COUNT(*) AS count
    FROM search_record sr
    LEFT JOIN organisation o ON o.organisation_id = sr.organisation_id
    WHERE sr.subject_id = ${subjectId}
    GROUP BY organisation_name, sr.search_type
    ORDER BY count DESC
  `);

  return {
    items: rows.map((r) => ({
      organisationName: r.organisation_name,
      searchType: r.search_type,
      count: r.count,
    })),
  };
}
