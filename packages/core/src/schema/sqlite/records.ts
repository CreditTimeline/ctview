import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';
import { subject, importBatch } from './provenance.js';
import { address } from './identity.js';
import { organisation } from './tradelines.js';

export const searchRecord = sqliteTable('search_record', {
  search_id: text('search_id').primaryKey(),
  subject_id: text('subject_id')
    .notNull()
    .references(() => subject.subject_id),
  searched_at: text('searched_at'),
  organisation_id: text('organisation_id').references(() => organisation.organisation_id),
  organisation_name_raw: text('organisation_name_raw'),
  search_type: text('search_type'),
  visibility: text('visibility'),
  joint_application: integer('joint_application'),
  input_name: text('input_name'),
  input_dob: text('input_dob'),
  input_address_id: text('input_address_id').references(() => address.address_id),
  reference: text('reference'),
  purpose_text: text('purpose_text'),
  source_import_id: text('source_import_id')
    .notNull()
    .references(() => importBatch.import_id),
  source_system: text('source_system').notNull(),
  extensions_json: text('extensions_json'),
});

export const creditScore = sqliteTable('credit_score', {
  score_id: text('score_id').primaryKey(),
  subject_id: text('subject_id')
    .notNull()
    .references(() => subject.subject_id),
  score_type: text('score_type'),
  score_name: text('score_name'),
  score_value: integer('score_value'),
  score_min: integer('score_min'),
  score_max: integer('score_max'),
  score_band: text('score_band'),
  calculated_at: text('calculated_at'),
  score_factors_json: text('score_factors_json'),
  source_import_id: text('source_import_id')
    .notNull()
    .references(() => importBatch.import_id),
  source_system: text('source_system').notNull(),
  extensions_json: text('extensions_json'),
});

export const publicRecord = sqliteTable('public_record', {
  public_record_id: text('public_record_id').primaryKey(),
  subject_id: text('subject_id')
    .notNull()
    .references(() => subject.subject_id),
  record_type: text('record_type'),
  court_or_register: text('court_or_register'),
  amount: integer('amount'),
  recorded_at: text('recorded_at'),
  satisfied_at: text('satisfied_at'),
  status: text('status'),
  address_id: text('address_id').references(() => address.address_id),
  source_import_id: text('source_import_id')
    .notNull()
    .references(() => importBatch.import_id),
  source_system: text('source_system').notNull(),
  extensions_json: text('extensions_json'),
});

export const noticeOfCorrection = sqliteTable('notice_of_correction', {
  notice_id: text('notice_id').primaryKey(),
  subject_id: text('subject_id')
    .notNull()
    .references(() => subject.subject_id),
  text: text('text'),
  created_at: text('created_at'),
  expires_at: text('expires_at'),
  scope: text('scope'),
  scope_entity_id: text('scope_entity_id'),
  source_import_id: text('source_import_id')
    .notNull()
    .references(() => importBatch.import_id),
  source_system: text('source_system').notNull(),
  extensions_json: text('extensions_json'),
});

export const propertyRecord = sqliteTable('property_record', {
  property_record_id: text('property_record_id').primaryKey(),
  subject_id: text('subject_id')
    .notNull()
    .references(() => subject.subject_id),
  address_id: text('address_id').references(() => address.address_id),
  property_type: text('property_type'),
  price_paid: integer('price_paid'),
  deed_date: text('deed_date'),
  tenure: text('tenure'),
  is_new_build: integer('is_new_build'),
  source_import_id: text('source_import_id')
    .notNull()
    .references(() => importBatch.import_id),
  source_system: text('source_system').notNull(),
  extensions_json: text('extensions_json'),
});

export const goneAwayRecord = sqliteTable('gone_away_record', {
  gone_away_id: text('gone_away_id').primaryKey(),
  subject_id: text('subject_id')
    .notNull()
    .references(() => subject.subject_id),
  network: text('network'),
  recorded_at: text('recorded_at'),
  old_address_id: text('old_address_id').references(() => address.address_id),
  new_address_id: text('new_address_id').references(() => address.address_id),
  notes: text('notes'),
  source_import_id: text('source_import_id')
    .notNull()
    .references(() => importBatch.import_id),
  source_system: text('source_system').notNull(),
  extensions_json: text('extensions_json'),
});

export const fraudMarker = sqliteTable('fraud_marker', {
  fraud_marker_id: text('fraud_marker_id').primaryKey(),
  subject_id: text('subject_id')
    .notNull()
    .references(() => subject.subject_id),
  scheme: text('scheme'),
  marker_type: text('marker_type'),
  placed_at: text('placed_at'),
  expires_at: text('expires_at'),
  address_scope: text('address_scope'),
  address_id: text('address_id').references(() => address.address_id),
  source_import_id: text('source_import_id')
    .notNull()
    .references(() => importBatch.import_id),
  source_system: text('source_system').notNull(),
  extensions_json: text('extensions_json'),
});

export const attributableItem = sqliteTable('attributable_item', {
  attributable_item_id: text('attributable_item_id').primaryKey(),
  subject_id: text('subject_id')
    .notNull()
    .references(() => subject.subject_id),
  entity_domain: text('entity_domain'),
  linked_entity_id: text('linked_entity_id'),
  summary: text('summary'),
  confidence: text('confidence'),
  reason: text('reason'),
  source_import_id: text('source_import_id')
    .notNull()
    .references(() => importBatch.import_id),
  source_system: text('source_system').notNull(),
  extensions_json: text('extensions_json'),
});

export const dispute = sqliteTable('dispute', {
  dispute_id: text('dispute_id').primaryKey(),
  subject_id: text('subject_id')
    .notNull()
    .references(() => subject.subject_id),
  entity_domain: text('entity_domain'),
  entity_id: text('entity_id'),
  opened_at: text('opened_at'),
  closed_at: text('closed_at'),
  status: text('status'),
  notes: text('notes'),
  source_import_id: text('source_import_id')
    .notNull()
    .references(() => importBatch.import_id),
  source_system: text('source_system').notNull(),
  extensions_json: text('extensions_json'),
});

export const generatedInsight = sqliteTable('generated_insight', {
  insight_id: text('insight_id').primaryKey(),
  subject_id: text('subject_id')
    .notNull()
    .references(() => subject.subject_id),
  kind: text('kind').notNull(),
  severity: text('severity'),
  summary: text('summary'),
  generated_at: text('generated_at').notNull(),
  source_import_id: text('source_import_id').references(() => importBatch.import_id),
  extensions_json: text('extensions_json'),
});

export const generatedInsightEntity = sqliteTable(
  'generated_insight_entity',
  {
    insight_id: text('insight_id')
      .notNull()
      .references(() => generatedInsight.insight_id),
    entity_id: text('entity_id').notNull(),
  },
  (table) => [primaryKey({ columns: [table.insight_id, table.entity_id] })],
);
