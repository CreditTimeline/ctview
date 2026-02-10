import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const schemaVersion = sqliteTable('schema_version', {
  version: integer('version').primaryKey(),
  applied_at: text('applied_at').notNull().default("datetime('now')"),
  description: text('description').notNull(),
});

export const subject = sqliteTable('subject', {
  subject_id: text('subject_id').primaryKey(),
  created_at: text('created_at').notNull(),
  extensions_json: text('extensions_json'),
});

export const creditFile = sqliteTable('credit_file', {
  file_id: text('file_id').primaryKey(),
  schema_version: text('schema_version').notNull(),
  currency_code: text('currency_code').default('GBP'),
  subject_id: text('subject_id')
    .notNull()
    .references(() => subject.subject_id),
  created_at: text('created_at').notNull(),
  extensions_json: text('extensions_json'),
});

export const importBatch = sqliteTable('import_batch', {
  import_id: text('import_id').primaryKey(),
  file_id: text('file_id')
    .notNull()
    .references(() => creditFile.file_id),
  subject_id: text('subject_id')
    .notNull()
    .references(() => subject.subject_id),
  imported_at: text('imported_at').notNull(),
  currency_code: text('currency_code').default('GBP'),
  source_system: text('source_system').notNull(),
  source_wrapper: text('source_wrapper'),
  acquisition_method: text('acquisition_method').notNull(),
  mapping_version: text('mapping_version'),
  confidence_notes: text('confidence_notes'),
  extensions_json: text('extensions_json'),
});

export const rawArtifact = sqliteTable('raw_artifact', {
  artifact_id: text('artifact_id').primaryKey(),
  import_id: text('import_id')
    .notNull()
    .references(() => importBatch.import_id),
  artifact_type: text('artifact_type').notNull(),
  sha256: text('sha256').notNull(),
  uri: text('uri'),
  embedded_base64: text('embedded_base64'),
  extracted_text_ref: text('extracted_text_ref'),
  extensions_json: text('extensions_json'),
});
