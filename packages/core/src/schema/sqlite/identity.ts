import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { subject, importBatch } from './provenance.js';

export const personName = sqliteTable('person_name', {
  name_id: text('name_id').primaryKey(),
  subject_id: text('subject_id')
    .notNull()
    .references(() => subject.subject_id),
  full_name: text('full_name'),
  title: text('title'),
  given_name: text('given_name'),
  middle_name: text('middle_name'),
  family_name: text('family_name'),
  suffix: text('suffix'),
  name_type: text('name_type'),
  valid_from: text('valid_from'),
  valid_to: text('valid_to'),
  source_import_id: text('source_import_id')
    .notNull()
    .references(() => importBatch.import_id),
  source_system: text('source_system').notNull(),
  extensions_json: text('extensions_json'),
});

export const subjectIdentifier = sqliteTable('subject_identifier', {
  identifier_id: text('identifier_id').primaryKey(),
  subject_id: text('subject_id')
    .notNull()
    .references(() => subject.subject_id),
  identifier_type: text('identifier_type').notNull(),
  value: text('value').notNull(),
  source_import_id: text('source_import_id')
    .notNull()
    .references(() => importBatch.import_id),
  source_system: text('source_system').notNull(),
  extensions_json: text('extensions_json'),
});

export const address = sqliteTable('address', {
  address_id: text('address_id').primaryKey(),
  line_1: text('line_1'),
  line_2: text('line_2'),
  line_3: text('line_3'),
  town_city: text('town_city'),
  county_region: text('county_region'),
  postcode: text('postcode'),
  country_code: text('country_code'),
  normalized_single_line: text('normalized_single_line'),
  extensions_json: text('extensions_json'),
});

export const addressAssociation = sqliteTable('address_association', {
  association_id: text('association_id').primaryKey(),
  subject_id: text('subject_id')
    .notNull()
    .references(() => subject.subject_id),
  address_id: text('address_id')
    .notNull()
    .references(() => address.address_id),
  role: text('role'),
  valid_from: text('valid_from'),
  valid_to: text('valid_to'),
  source_import_id: text('source_import_id')
    .notNull()
    .references(() => importBatch.import_id),
  source_system: text('source_system').notNull(),
  extensions_json: text('extensions_json'),
});

export const addressLink = sqliteTable('address_link', {
  address_link_id: text('address_link_id').primaryKey(),
  subject_id: text('subject_id')
    .notNull()
    .references(() => subject.subject_id),
  from_address_id: text('from_address_id')
    .notNull()
    .references(() => address.address_id),
  to_address_id: text('to_address_id')
    .notNull()
    .references(() => address.address_id),
  source_organisation_name: text('source_organisation_name'),
  last_confirmed_at: text('last_confirmed_at'),
  source_import_id: text('source_import_id')
    .notNull()
    .references(() => importBatch.import_id),
  source_system: text('source_system').notNull(),
  extensions_json: text('extensions_json'),
});

export const financialAssociate = sqliteTable('financial_associate', {
  associate_id: text('associate_id').primaryKey(),
  subject_id: text('subject_id')
    .notNull()
    .references(() => subject.subject_id),
  associate_name: text('associate_name'),
  relationship_basis: text('relationship_basis'),
  status: text('status'),
  confirmed_at: text('confirmed_at'),
  source_import_id: text('source_import_id')
    .notNull()
    .references(() => importBatch.import_id),
  source_system: text('source_system').notNull(),
  extensions_json: text('extensions_json'),
});

export const electoralRollEntry = sqliteTable('electoral_roll_entry', {
  electoral_entry_id: text('electoral_entry_id').primaryKey(),
  subject_id: text('subject_id')
    .notNull()
    .references(() => subject.subject_id),
  address_id: text('address_id').references(() => address.address_id),
  name_on_register: text('name_on_register'),
  registered_from: text('registered_from'),
  registered_to: text('registered_to'),
  change_type: text('change_type'),
  marketing_opt_out: integer('marketing_opt_out'),
  source_import_id: text('source_import_id')
    .notNull()
    .references(() => importBatch.import_id),
  source_system: text('source_system').notNull(),
  extensions_json: text('extensions_json'),
});
