import { nanoid } from 'nanoid';
import { ingestReceipt, auditLog } from '../../schema/sqlite/index.js';
import { toJsonText } from '../transforms.js';
import type { IngestContext } from '../ingest-context.js';

/**
 * Creates an ingest_receipt row after all entities have been inserted.
 * Returns the generated receipt_id for inclusion in the API response.
 */
export function insertIngestReceipt(
  ctx: IngestContext,
  opts: {
    payloadSha256: string;
    durationMs: number;
    status: string;
    errorMessage?: string;
  },
): string {
  const receiptId = nanoid();
  ctx.tx
    .insert(ingestReceipt)
    .values({
      receipt_id: receiptId,
      file_id: ctx.file.file_id,
      payload_sha256: opts.payloadSha256,
      entity_counts_json: toJsonText(ctx.entityCounts),
      ingested_at: new Date().toISOString(),
      duration_ms: opts.durationMs,
      status: opts.status,
      error_message: opts.errorMessage,
    })
    .run();
  return receiptId;
}

/**
 * Writes an audit_log row for significant ingestion events.
 */
export function insertAuditLogEntry(
  ctx: IngestContext,
  eventType: string,
  detail?: Record<string, unknown>,
): void {
  ctx.tx
    .insert(auditLog)
    .values({
      log_id: nanoid(),
      event_type: eventType,
      entity_type: 'credit_file',
      entity_id: ctx.file.file_id,
      detail_json: toJsonText(detail),
      created_at: new Date().toISOString(),
    })
    .run();
}
