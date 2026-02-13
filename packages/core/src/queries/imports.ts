import { sql, eq, type SQL } from 'drizzle-orm';
import type { AppDatabase } from '../db/client.js';
import { importBatch, rawArtifact } from '../schema/sqlite/provenance.js';
import { ingestReceipt } from '../schema/sqlite/app.js';
import { parseJsonColumn, paginate } from './helpers.js';
import type {
  ImportListParams,
  PaginatedResult,
  ImportListItem,
  ImportDetail,
  ImportDiff,
  ImportDiffDelta,
} from './types.js';

export function listImports(
  db: AppDatabase,
  params: ImportListParams,
): PaginatedResult<ImportListItem> {
  const { limit, offset, subjectId } = params;

  const conditions: SQL[] = [];
  if (subjectId) conditions.push(sql`ib.subject_id = ${subjectId}`);

  const where = conditions.length > 0 ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``;

  interface Row {
    import_id: string;
    file_id: string;
    subject_id: string;
    imported_at: string;
    source_system: string;
    acquisition_method: string;
    status: string | null;
    duration_ms: number | null;
    entity_counts_json: string | null;
  }

  const rows = db.all<Row>(sql`
    SELECT
      ib.import_id, ib.file_id, ib.subject_id, ib.imported_at,
      ib.source_system, ib.acquisition_method,
      ir.status, ir.duration_ms, ir.entity_counts_json
    FROM import_batch ib
    LEFT JOIN ingest_receipt ir ON ir.file_id = ib.file_id
    ${where}
    ORDER BY ib.imported_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `);

  const totalRow = db.all<{ count: number }>(sql`
    SELECT COUNT(*) as count FROM import_batch ib ${where}
  `);
  const total = totalRow[0]?.count ?? 0;

  const items: ImportListItem[] = rows.map((r) => ({
    importId: r.import_id,
    fileId: r.file_id,
    subjectId: r.subject_id,
    importedAt: r.imported_at,
    sourceSystem: r.source_system,
    acquisitionMethod: r.acquisition_method,
    status: r.status,
    durationMs: r.duration_ms,
    entityCounts: parseJsonColumn<Record<string, number>>(r.entity_counts_json),
  }));

  return paginate(items, total, limit, offset);
}

export function getImportDetail(db: AppDatabase, importId: string): ImportDetail | null {
  // Use direct queries instead of relational API
  const imp = db.select().from(importBatch).where(eq(importBatch.import_id, importId)).get();
  if (!imp) return null;

  const artifacts = db.select().from(rawArtifact).where(eq(rawArtifact.import_id, importId)).all();

  const receipt = db
    .select()
    .from(ingestReceipt)
    .where(eq(ingestReceipt.file_id, imp.file_id))
    .get();

  return {
    importId: imp.import_id,
    fileId: imp.file_id,
    subjectId: imp.subject_id,
    importedAt: imp.imported_at,
    sourceSystem: imp.source_system,
    acquisitionMethod: imp.acquisition_method,
    sourceWrapper: imp.source_wrapper,
    mappingVersion: imp.mapping_version,
    confidenceNotes: imp.confidence_notes,
    rawArtifacts: artifacts.map((a) => ({
      artifactId: a.artifact_id,
      artifactType: a.artifact_type,
      sha256: a.sha256,
      uri: a.uri,
    })),
    receipt: receipt
      ? {
          receiptId: receipt.receipt_id,
          status: receipt.status,
          durationMs: receipt.duration_ms,
          entityCounts: parseJsonColumn<Record<string, number>>(receipt.entity_counts_json),
          ingestedAt: receipt.ingested_at,
        }
      : null,
  };
}

export function diffImports(db: AppDatabase, importIdA: string, importIdB: string): ImportDiff {
  const receiptA = db
    .select({ entity_counts_json: ingestReceipt.entity_counts_json })
    .from(ingestReceipt)
    .where(eq(ingestReceipt.import_id, importIdA))
    .get();

  const receiptB = db
    .select({ entity_counts_json: ingestReceipt.entity_counts_json })
    .from(ingestReceipt)
    .where(eq(ingestReceipt.import_id, importIdB))
    .get();

  const countsA =
    parseJsonColumn<Record<string, number>>(receiptA?.entity_counts_json ?? null) ?? {};
  const countsB =
    parseJsonColumn<Record<string, number>>(receiptB?.entity_counts_json ?? null) ?? {};

  const allKeys = new Set([...Object.keys(countsA), ...Object.keys(countsB)]);
  const deltas: ImportDiffDelta[] = [];

  for (const key of allKeys) {
    const a = countsA[key] ?? 0;
    const b = countsB[key] ?? 0;
    deltas.push({
      entityType: key,
      countA: a,
      countB: b,
      delta: b - a,
    });
  }

  return { importIdA, importIdB, deltas };
}
