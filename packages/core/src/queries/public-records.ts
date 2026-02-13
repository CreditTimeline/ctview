import { sql, type SQL } from 'drizzle-orm';
import type { AppDatabase } from '../db/client.js';
import { paginate } from './helpers.js';
import type { PublicRecordListParams, PaginatedResult, PublicRecordSummary } from './types.js';

export function listPublicRecords(
  db: AppDatabase,
  params: PublicRecordListParams,
): PaginatedResult<PublicRecordSummary> {
  const { limit, offset, subjectId } = params;

  const conditions: SQL[] = [];
  if (subjectId) conditions.push(sql`pr.subject_id = ${subjectId}`);

  const where = conditions.length > 0 ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``;

  interface Row {
    public_record_id: string;
    record_type: string | null;
    court_or_register: string | null;
    amount: number | null;
    recorded_at: string | null;
    satisfied_at: string | null;
    status: string | null;
    source_system: string;
  }

  const rows = db.all<Row>(sql`
    SELECT
      pr.public_record_id,
      pr.record_type,
      pr.court_or_register,
      pr.amount,
      pr.recorded_at,
      pr.satisfied_at,
      pr.status,
      pr.source_system
    FROM public_record pr
    ${where}
    ORDER BY pr.recorded_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `);

  const totalRow = db.all<{ count: number }>(sql`
    SELECT COUNT(*) as count FROM public_record pr ${where}
  `);
  const total = totalRow[0]?.count ?? 0;

  const items: PublicRecordSummary[] = rows.map((r) => ({
    publicRecordId: r.public_record_id,
    recordType: r.record_type,
    courtOrRegister: r.court_or_register,
    amount: r.amount,
    recordedAt: r.recorded_at,
    satisfiedAt: r.satisfied_at,
    status: r.status,
    sourceSystem: r.source_system,
  }));

  return paginate(items, total, limit, offset);
}
