import { sqliteTable, text, integer, unique } from 'drizzle-orm/sqlite-core';
import { subject, importBatch } from './provenance.js';

export const organisation = sqliteTable('organisation', {
  organisation_id: text('organisation_id').primaryKey(),
  subject_id: text('subject_id')
    .notNull()
    .references(() => subject.subject_id),
  name: text('name').notNull(),
  roles_json: text('roles_json'),
  industry_type: text('industry_type'),
  source_import_id: text('source_import_id').references(() => importBatch.import_id),
  source_system: text('source_system'),
  extensions_json: text('extensions_json'),
});

export const tradeline = sqliteTable('tradeline', {
  tradeline_id: text('tradeline_id').primaryKey(),
  canonical_id: text('canonical_id'),
  subject_id: text('subject_id')
    .notNull()
    .references(() => subject.subject_id),
  furnisher_organisation_id: text('furnisher_organisation_id').references(
    () => organisation.organisation_id,
  ),
  furnisher_name_raw: text('furnisher_name_raw'),
  account_type: text('account_type'),
  opened_at: text('opened_at'),
  closed_at: text('closed_at'),
  status_current: text('status_current'),
  repayment_frequency: text('repayment_frequency'),
  regular_payment_amount: integer('regular_payment_amount'),
  supplementary_info: text('supplementary_info'),
  source_import_id: text('source_import_id')
    .notNull()
    .references(() => importBatch.import_id),
  source_system: text('source_system').notNull(),
  extensions_json: text('extensions_json'),
});

export const tradelineIdentifier = sqliteTable('tradeline_identifier', {
  identifier_id: text('identifier_id').primaryKey(),
  tradeline_id: text('tradeline_id')
    .notNull()
    .references(() => tradeline.tradeline_id),
  identifier_type: text('identifier_type').notNull(),
  value: text('value').notNull(),
  source_import_id: text('source_import_id')
    .notNull()
    .references(() => importBatch.import_id),
  source_system: text('source_system').notNull(),
  extensions_json: text('extensions_json'),
});

export const tradelineParty = sqliteTable('tradeline_party', {
  party_id: text('party_id').primaryKey(),
  tradeline_id: text('tradeline_id')
    .notNull()
    .references(() => tradeline.tradeline_id),
  party_role: text('party_role'),
  name: text('name'),
  source_import_id: text('source_import_id')
    .notNull()
    .references(() => importBatch.import_id),
  source_system: text('source_system').notNull(),
  extensions_json: text('extensions_json'),
});

export const tradelineTerms = sqliteTable('tradeline_terms', {
  terms_id: text('terms_id').primaryKey(),
  tradeline_id: text('tradeline_id')
    .notNull()
    .references(() => tradeline.tradeline_id),
  term_type: text('term_type'),
  term_count: integer('term_count'),
  term_payment_amount: integer('term_payment_amount'),
  payment_start_date: text('payment_start_date'),
  source_import_id: text('source_import_id')
    .notNull()
    .references(() => importBatch.import_id),
  source_system: text('source_system').notNull(),
  extensions_json: text('extensions_json'),
});

export const tradelineSnapshot = sqliteTable('tradeline_snapshot', {
  snapshot_id: text('snapshot_id').primaryKey(),
  tradeline_id: text('tradeline_id')
    .notNull()
    .references(() => tradeline.tradeline_id),
  as_of_date: text('as_of_date'),
  status_current: text('status_current'),
  source_account_ref: text('source_account_ref'),
  current_balance: integer('current_balance'),
  opening_balance: integer('opening_balance'),
  credit_limit: integer('credit_limit'),
  delinquent_balance: integer('delinquent_balance'),
  payment_amount: integer('payment_amount'),
  statement_balance: integer('statement_balance'),
  minimum_payment_received: integer('minimum_payment_received'),
  cash_advance_amount: integer('cash_advance_amount'),
  cash_advance_count: integer('cash_advance_count'),
  credit_limit_change: text('credit_limit_change'),
  promotional_rate_flag: integer('promotional_rate_flag'),
  source_import_id: text('source_import_id')
    .notNull()
    .references(() => importBatch.import_id),
  source_system: text('source_system').notNull(),
  extensions_json: text('extensions_json'),
});

export const tradelineMonthlyMetric = sqliteTable(
  'tradeline_monthly_metric',
  {
    monthly_metric_id: text('monthly_metric_id').primaryKey(),
    tradeline_id: text('tradeline_id')
      .notNull()
      .references(() => tradeline.tradeline_id),
    period: text('period').notNull(),
    metric_type: text('metric_type').notNull(),
    value_numeric: integer('value_numeric'),
    value_text: text('value_text'),
    canonical_status: text('canonical_status'),
    raw_status_code: text('raw_status_code'),
    reported_at: text('reported_at'),
    metric_value_key: text('metric_value_key').notNull(),
    source_import_id: text('source_import_id')
      .notNull()
      .references(() => importBatch.import_id),
    source_system: text('source_system').notNull(),
    extensions_json: text('extensions_json'),
  },
  (table) => [
    unique('uq_tradeline_metric').on(
      table.tradeline_id,
      table.period,
      table.metric_type,
      table.source_import_id,
      table.metric_value_key,
    ),
  ],
);

export const tradelineEvent = sqliteTable('tradeline_event', {
  event_id: text('event_id').primaryKey(),
  tradeline_id: text('tradeline_id')
    .notNull()
    .references(() => tradeline.tradeline_id),
  event_type: text('event_type').notNull(),
  event_date: text('event_date').notNull(),
  amount: integer('amount'),
  notes: text('notes'),
  source_import_id: text('source_import_id')
    .notNull()
    .references(() => importBatch.import_id),
  source_system: text('source_system').notNull(),
  extensions_json: text('extensions_json'),
});
