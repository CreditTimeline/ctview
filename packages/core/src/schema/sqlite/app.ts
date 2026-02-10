import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { creditFile, importBatch } from './provenance.js';

export const ingestReceipt = sqliteTable(
  'ingest_receipt',
  {
    receipt_id: text('receipt_id').primaryKey(),
    file_id: text('file_id')
      .notNull()
      .references(() => creditFile.file_id),
    import_id: text('import_id').references(() => importBatch.import_id),
    payload_sha256: text('payload_sha256').notNull(),
    entity_counts_json: text('entity_counts_json'),
    ingested_at: text('ingested_at').notNull(),
    duration_ms: integer('duration_ms'),
    status: text('status').notNull(),
    error_message: text('error_message'),
  },
  (table) => [index('idx_ingest_receipt_sha256').on(table.payload_sha256)],
);

export const auditLog = sqliteTable(
  'audit_log',
  {
    log_id: text('log_id').primaryKey(),
    event_type: text('event_type').notNull(),
    entity_type: text('entity_type'),
    entity_id: text('entity_id'),
    detail_json: text('detail_json'),
    created_at: text('created_at').notNull(),
  },
  (table) => [index('idx_audit_log_event_type').on(table.event_type, table.created_at)],
);

export const appSettings = sqliteTable('app_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updated_at: text('updated_at').notNull(),
});
