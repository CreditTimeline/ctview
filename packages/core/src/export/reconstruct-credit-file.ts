/**
 * Reconstructs a CreditFile canonical JSON from the database.
 * This is the inverse of the ingestion pipeline.
 *
 * Known gap: dates_of_birth are not stored in the database,
 * so the reconstructed JSON will omit them from subject.
 */

import { eq, inArray } from 'drizzle-orm';
import type { AppDatabase } from '../db/client.js';
import {
  creditFile,
  importBatch,
  rawArtifact,
  subject,
  personName,
  subjectIdentifier,
  address,
  addressAssociation,
  addressLink,
  financialAssociate,
  electoralRollEntry,
  organisation,
  tradeline,
  tradelineIdentifier,
  tradelineParty,
  tradelineTerms,
  tradelineSnapshot,
  tradelineMonthlyMetric,
  tradelineEvent,
  searchRecord,
  creditScore,
  publicRecord,
  noticeOfCorrection,
  propertyRecord,
  goneAwayRecord,
  fraudMarker,
  attributableItem,
  dispute,
} from '../schema/sqlite/index.js';
import { intToBool, parseExtensions, parseJsonArray } from './transforms.js';
import type {
  CreditFile,
  ImportBatch,
  RawArtifact,
  Subject,
  PersonName,
  SubjectIdentifier,
  Address,
  AddressAssociation,
  AddressLink,
  FinancialAssociate,
  ElectoralRollEntry,
  Organisation,
  Tradeline,
  TradelineIdentifier,
  TradelineParty,
  TradelineTerms,
  TradelineSnapshot,
  TradelineMonthlyMetric,
  TradelineEvent,
  SearchRecord,
  CreditScore,
  PublicRecord,
  NoticeOfCorrection,
  PropertyRecord,
  GoneAwayRecord,
  FraudMarker,
  AttributableItem,
  Dispute,
} from '../types/canonical.js';

function optionalBool(value: number | null): boolean | null | undefined {
  const b = intToBool(value);
  return b === null ? undefined : b;
}

export function reconstructCreditFile(db: AppDatabase, fileId: string): CreditFile | null {
  // 1. Get credit_file row
  const fileRow = db.select().from(creditFile).where(eq(creditFile.file_id, fileId)).get();
  if (!fileRow) return null;

  // 2. Get import batches
  const importRows = db.select().from(importBatch).where(eq(importBatch.file_id, fileId)).all();

  const importIds = importRows.map((i) => i.import_id);
  if (importIds.length === 0) return null;

  // 3. Build imports with raw artifacts
  const imports = buildImports(db, importRows);

  // 4. Get subject
  const subjectRow = db
    .select()
    .from(subject)
    .where(eq(subject.subject_id, fileRow.subject_id))
    .get();
  if (!subjectRow) return null;

  const subj = buildSubject(db, subjectRow, importIds);

  // 5. Build all entity collections
  const result: CreditFile = {
    schema_version: fileRow.schema_version,
    file_id: fileRow.file_id,
    subject_id: fileRow.subject_id,
    created_at: fileRow.created_at,
    ...(fileRow.currency_code ? { currency_code: fileRow.currency_code } : {}),
    imports,
    subject: subj,
  };

  assignIfNonEmpty(result, 'organisations', buildOrganisations(db, importIds));
  assignIfNonEmpty(result, 'addresses', buildAddresses(db, importIds));
  assignIfNonEmpty(result, 'address_associations', buildAddressAssociations(db, importIds));
  assignIfNonEmpty(result, 'address_links', buildAddressLinks(db, importIds));
  assignIfNonEmpty(result, 'financial_associates', buildFinancialAssociates(db, importIds));
  assignIfNonEmpty(result, 'electoral_roll_entries', buildElectoralRollEntries(db, importIds));
  assignIfNonEmpty(result, 'tradelines', buildTradelines(db, importIds));
  assignIfNonEmpty(result, 'searches', buildSearches(db, importIds));
  assignIfNonEmpty(result, 'credit_scores', buildCreditScores(db, importIds));
  assignIfNonEmpty(result, 'public_records', buildPublicRecords(db, importIds));
  assignIfNonEmpty(result, 'notices_of_correction', buildNoticesOfCorrection(db, importIds));
  assignIfNonEmpty(result, 'property_records', buildPropertyRecords(db, importIds));
  assignIfNonEmpty(result, 'gone_away_records', buildGoneAwayRecords(db, importIds));
  assignIfNonEmpty(result, 'fraud_markers', buildFraudMarkers(db, importIds));
  assignIfNonEmpty(result, 'attributable_items', buildAttributableItems(db, importIds));
  assignIfNonEmpty(result, 'disputes', buildDisputes(db, importIds));

  if (fileRow.extensions_json) {
    result.extensions = parseExtensions(fileRow.extensions_json);
  }

  return result;
}

function assignIfNonEmpty<K extends keyof CreditFile>(
  target: CreditFile,
  key: K,
  arr: NonNullable<CreditFile[K]>,
) {
  if (Array.isArray(arr) && arr.length > 0) {
    target[key] = arr;
  }
}

// ---------------------------------------------------------------------------
// Provenance
// ---------------------------------------------------------------------------

function buildImports(
  db: AppDatabase,
  importRows: (typeof importBatch.$inferSelect)[],
): ImportBatch[] {
  return importRows.map((row) => {
    const artifacts = db
      .select()
      .from(rawArtifact)
      .where(eq(rawArtifact.import_id, row.import_id))
      .all();

    const imp: ImportBatch = {
      import_id: row.import_id,
      imported_at: row.imported_at,
      source_system: row.source_system,
      acquisition_method: row.acquisition_method,
      ...(row.currency_code ? { currency_code: row.currency_code } : {}),
      ...(row.source_wrapper ? { source_wrapper: row.source_wrapper } : {}),
      ...(row.mapping_version ? { mapping_version: row.mapping_version } : {}),
      ...(row.confidence_notes ? { confidence_notes: row.confidence_notes } : {}),
    };

    if (artifacts.length > 0) {
      imp.raw_artifacts = artifacts.map(buildRawArtifact);
    }

    const ext = parseExtensions(row.extensions_json);
    if (ext) imp.extensions = ext;

    return imp;
  });
}

function buildRawArtifact(row: typeof rawArtifact.$inferSelect): RawArtifact {
  const art: RawArtifact = {
    artifact_id: row.artifact_id,
    artifact_type: row.artifact_type,
    sha256: row.sha256,
  };
  if (row.uri) art.uri = row.uri;
  if (row.embedded_base64) art.embedded_base64 = row.embedded_base64;
  if (row.extracted_text_ref) art.extracted_text_ref = row.extracted_text_ref;
  const ext = parseExtensions(row.extensions_json);
  if (ext) art.extensions = ext;
  return art;
}

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

function buildSubject(
  db: AppDatabase,
  subjectRow: typeof subject.$inferSelect,
  importIds: string[],
): Subject {
  const subj: Subject = {
    subject_id: subjectRow.subject_id,
    // Note: dates_of_birth are NOT stored in the database and cannot be reconstructed
  };

  const names = db
    .select()
    .from(personName)
    .where(inArray(personName.source_import_id, importIds))
    .all();

  if (names.length > 0) {
    subj.names = names.map(buildPersonName);
  }

  const identifiers = db
    .select()
    .from(subjectIdentifier)
    .where(inArray(subjectIdentifier.source_import_id, importIds))
    .all();

  if (identifiers.length > 0) {
    subj.identifiers = identifiers.map(buildSubjectIdentifier);
  }

  const ext = parseExtensions(subjectRow.extensions_json);
  if (ext) subj.extensions = ext;

  return subj;
}

function buildPersonName(row: typeof personName.$inferSelect): PersonName {
  const n: PersonName = {
    name_id: row.name_id,
    source_import_id: row.source_import_id,
  };
  if (row.full_name) n.full_name = row.full_name;
  if (row.title) n.title = row.title;
  if (row.given_name) n.given_name = row.given_name;
  if (row.middle_name) n.middle_name = row.middle_name;
  if (row.family_name) n.family_name = row.family_name;
  if (row.suffix) n.suffix = row.suffix;
  if (row.name_type) n.name_type = row.name_type;
  if (row.valid_from) n.valid_from = row.valid_from;
  if (row.valid_to) n.valid_to = row.valid_to;
  const ext = parseExtensions(row.extensions_json);
  if (ext) n.extensions = ext;
  return n;
}

function buildSubjectIdentifier(row: typeof subjectIdentifier.$inferSelect): SubjectIdentifier {
  const id: SubjectIdentifier = {
    identifier_id: row.identifier_id,
    identifier_type: row.identifier_type,
    value: row.value,
    source_import_id: row.source_import_id,
  };
  const ext = parseExtensions(row.extensions_json);
  if (ext) id.extensions = ext;
  return id;
}

// ---------------------------------------------------------------------------
// Addresses
// ---------------------------------------------------------------------------

function buildAddresses(db: AppDatabase, importIds: string[]): Address[] {
  // Addresses don't have source_import_id directly; get unique addresses
  // referenced by address_associations belonging to our imports
  const assocRows = db
    .select()
    .from(addressAssociation)
    .where(inArray(addressAssociation.source_import_id, importIds))
    .all();

  const addrIds = [...new Set(assocRows.map((a) => a.address_id))];
  if (addrIds.length === 0) return [];

  const rows = db.select().from(address).where(inArray(address.address_id, addrIds)).all();

  return rows.map((row) => {
    const a: Address = { address_id: row.address_id };
    if (row.line_1) a.line_1 = row.line_1;
    if (row.line_2) a.line_2 = row.line_2;
    if (row.line_3) a.line_3 = row.line_3;
    if (row.town_city) a.town_city = row.town_city;
    if (row.county_region) a.county_region = row.county_region;
    if (row.postcode) a.postcode = row.postcode;
    if (row.country_code) a.country_code = row.country_code;
    if (row.normalized_single_line) a.normalized_single_line = row.normalized_single_line;
    const ext = parseExtensions(row.extensions_json);
    if (ext) a.extensions = ext;
    return a;
  });
}

function buildAddressAssociations(db: AppDatabase, importIds: string[]): AddressAssociation[] {
  const rows = db
    .select()
    .from(addressAssociation)
    .where(inArray(addressAssociation.source_import_id, importIds))
    .all();

  return rows.map((row) => {
    const a: AddressAssociation = {
      association_id: row.association_id,
      address_id: row.address_id,
      source_import_id: row.source_import_id,
    };
    if (row.role) a.role = row.role;
    if (row.valid_from) a.valid_from = row.valid_from;
    if (row.valid_to) a.valid_to = row.valid_to;
    const ext = parseExtensions(row.extensions_json);
    if (ext) a.extensions = ext;
    return a;
  });
}

function buildAddressLinks(db: AppDatabase, importIds: string[]): AddressLink[] {
  const rows = db
    .select()
    .from(addressLink)
    .where(inArray(addressLink.source_import_id, importIds))
    .all();

  return rows.map((row) => {
    const l: AddressLink = {
      address_link_id: row.address_link_id,
      from_address_id: row.from_address_id,
      to_address_id: row.to_address_id,
      source_import_id: row.source_import_id,
    };
    if (row.source_organisation_name) l.source_organisation_name = row.source_organisation_name;
    if (row.last_confirmed_at) l.last_confirmed_at = row.last_confirmed_at;
    const ext = parseExtensions(row.extensions_json);
    if (ext) l.extensions = ext;
    return l;
  });
}

function buildFinancialAssociates(db: AppDatabase, importIds: string[]): FinancialAssociate[] {
  const rows = db
    .select()
    .from(financialAssociate)
    .where(inArray(financialAssociate.source_import_id, importIds))
    .all();

  return rows.map((row) => {
    const f: FinancialAssociate = {
      associate_id: row.associate_id,
      source_import_id: row.source_import_id,
    };
    if (row.associate_name) f.associate_name = row.associate_name;
    if (row.relationship_basis) f.relationship_basis = row.relationship_basis;
    if (row.status) f.status = row.status;
    if (row.confirmed_at) f.confirmed_at = row.confirmed_at;
    const ext = parseExtensions(row.extensions_json);
    if (ext) f.extensions = ext;
    return f;
  });
}

function buildElectoralRollEntries(db: AppDatabase, importIds: string[]): ElectoralRollEntry[] {
  const rows = db
    .select()
    .from(electoralRollEntry)
    .where(inArray(electoralRollEntry.source_import_id, importIds))
    .all();

  return rows.map((row) => {
    const e: ElectoralRollEntry = {
      electoral_entry_id: row.electoral_entry_id,
      source_import_id: row.source_import_id,
    };
    if (row.address_id) e.address_id = row.address_id;
    if (row.name_on_register) e.name_on_register = row.name_on_register;
    if (row.registered_from) e.registered_from = row.registered_from;
    if (row.registered_to) e.registered_to = row.registered_to;
    if (row.change_type) e.change_type = row.change_type;
    const marketingOptOut = optionalBool(row.marketing_opt_out);
    if (marketingOptOut !== undefined) e.marketing_opt_out = marketingOptOut;
    const ext = parseExtensions(row.extensions_json);
    if (ext) e.extensions = ext;
    return e;
  });
}

// ---------------------------------------------------------------------------
// Organisations
// ---------------------------------------------------------------------------

function buildOrganisations(db: AppDatabase, importIds: string[]): Organisation[] {
  // Organisations may or may not have source_import_id set
  const rows = db
    .select()
    .from(organisation)
    .where(inArray(organisation.source_import_id, importIds))
    .all();

  return rows.map((row) => {
    const o: Organisation = {
      organisation_id: row.organisation_id,
      name: row.name,
    };
    const roles = parseJsonArray<string>(row.roles_json);
    if (roles) o.roles = roles;
    if (row.industry_type) o.industry_type = row.industry_type;
    if (row.source_import_id) o.source_import_id = row.source_import_id;
    const ext = parseExtensions(row.extensions_json);
    if (ext) o.extensions = ext;
    return o;
  });
}

// ---------------------------------------------------------------------------
// Tradelines
// ---------------------------------------------------------------------------

function buildTradelines(db: AppDatabase, importIds: string[]): Tradeline[] {
  const rows = db
    .select()
    .from(tradeline)
    .where(inArray(tradeline.source_import_id, importIds))
    .all();

  return rows.map((row) => {
    const t: Tradeline = {
      tradeline_id: row.tradeline_id,
      source_import_id: row.source_import_id,
    };
    if (row.canonical_id) t.canonical_id = row.canonical_id;
    if (row.furnisher_organisation_id) t.furnisher_organisation_id = row.furnisher_organisation_id;
    if (row.furnisher_name_raw) t.furnisher_name_raw = row.furnisher_name_raw;
    if (row.account_type) t.account_type = row.account_type;
    if (row.opened_at) t.opened_at = row.opened_at;
    if (row.closed_at) t.closed_at = row.closed_at;
    if (row.status_current) t.status_current = row.status_current;
    if (row.repayment_frequency) t.repayment_frequency = row.repayment_frequency;
    if (row.regular_payment_amount !== null) t.regular_payment_amount = row.regular_payment_amount;
    if (row.supplementary_info) t.supplementary_info = row.supplementary_info;

    // Child entities
    const identifiers = buildTradelineIdentifiers(db, row.tradeline_id);
    if (identifiers.length > 0) t.identifiers = identifiers;

    const parties = buildTradelineParties(db, row.tradeline_id);
    if (parties.length > 0) t.parties = parties;

    const terms = buildTradelineTermsObj(db, row.tradeline_id);
    if (terms) t.terms = terms;

    const snapshots = buildTradelineSnapshots(db, row.tradeline_id);
    if (snapshots.length > 0) t.snapshots = snapshots;

    const monthlyMetrics = buildTradelineMonthlyMetrics(db, row.tradeline_id);
    if (monthlyMetrics.length > 0) t.monthly_metrics = monthlyMetrics;

    const events = buildTradelineEvents(db, row.tradeline_id);
    if (events.length > 0) t.events = events;

    const ext = parseExtensions(row.extensions_json);
    if (ext) t.extensions = ext;

    return t;
  });
}

function buildTradelineIdentifiers(db: AppDatabase, tradelineId: string): TradelineIdentifier[] {
  const rows = db
    .select()
    .from(tradelineIdentifier)
    .where(eq(tradelineIdentifier.tradeline_id, tradelineId))
    .all();

  return rows.map((row) => {
    const id: TradelineIdentifier = {
      identifier_id: row.identifier_id,
      identifier_type: row.identifier_type,
      value: row.value,
      source_import_id: row.source_import_id,
    };
    const ext = parseExtensions(row.extensions_json);
    if (ext) id.extensions = ext;
    return id;
  });
}

function buildTradelineParties(db: AppDatabase, tradelineId: string): TradelineParty[] {
  const rows = db
    .select()
    .from(tradelineParty)
    .where(eq(tradelineParty.tradeline_id, tradelineId))
    .all();

  return rows.map((row) => {
    const p: TradelineParty = {
      party_id: row.party_id,
      source_import_id: row.source_import_id,
    };
    if (row.party_role) p.party_role = row.party_role;
    if (row.name) p.name = row.name;
    const ext = parseExtensions(row.extensions_json);
    if (ext) p.extensions = ext;
    return p;
  });
}

function buildTradelineTermsObj(db: AppDatabase, tradelineId: string): TradelineTerms | undefined {
  // Terms is a single object per tradeline in canonical JSON
  const row = db
    .select()
    .from(tradelineTerms)
    .where(eq(tradelineTerms.tradeline_id, tradelineId))
    .get();

  if (!row) return undefined;

  const t: TradelineTerms = {
    terms_id: row.terms_id,
    source_import_id: row.source_import_id,
  };
  if (row.term_type) t.term_type = row.term_type;
  if (row.term_count !== null) t.term_count = row.term_count;
  if (row.term_payment_amount !== null) t.term_payment_amount = row.term_payment_amount;
  if (row.payment_start_date) t.payment_start_date = row.payment_start_date;
  const ext = parseExtensions(row.extensions_json);
  if (ext) t.extensions = ext;
  return t;
}

function buildTradelineSnapshots(db: AppDatabase, tradelineId: string): TradelineSnapshot[] {
  const rows = db
    .select()
    .from(tradelineSnapshot)
    .where(eq(tradelineSnapshot.tradeline_id, tradelineId))
    .all();

  return rows.map((row) => {
    const s: TradelineSnapshot = {
      snapshot_id: row.snapshot_id,
      source_import_id: row.source_import_id,
    };
    if (row.as_of_date) s.as_of_date = row.as_of_date;
    if (row.status_current) s.status_current = row.status_current;
    if (row.source_account_ref) s.source_account_ref = row.source_account_ref;
    if (row.current_balance !== null) s.current_balance = row.current_balance;
    if (row.opening_balance !== null) s.opening_balance = row.opening_balance;
    if (row.credit_limit !== null) s.credit_limit = row.credit_limit;
    if (row.delinquent_balance !== null) s.delinquent_balance = row.delinquent_balance;
    if (row.payment_amount !== null) s.payment_amount = row.payment_amount;
    if (row.statement_balance !== null) s.statement_balance = row.statement_balance;
    const minPayment = optionalBool(row.minimum_payment_received);
    if (minPayment !== undefined) s.minimum_payment_received = minPayment;
    if (row.cash_advance_amount !== null) s.cash_advance_amount = row.cash_advance_amount;
    if (row.cash_advance_count !== null) s.cash_advance_count = row.cash_advance_count;
    if (row.credit_limit_change) s.credit_limit_change = row.credit_limit_change;
    const promoFlag = optionalBool(row.promotional_rate_flag);
    if (promoFlag !== undefined) s.promotional_rate_flag = promoFlag;
    const ext = parseExtensions(row.extensions_json);
    if (ext) s.extensions = ext;
    return s;
  });
}

function buildTradelineMonthlyMetrics(
  db: AppDatabase,
  tradelineId: string,
): TradelineMonthlyMetric[] {
  const rows = db
    .select()
    .from(tradelineMonthlyMetric)
    .where(eq(tradelineMonthlyMetric.tradeline_id, tradelineId))
    .all();

  return rows.map((row) => {
    const m: TradelineMonthlyMetric = {
      monthly_metric_id: row.monthly_metric_id,
      period: row.period,
      metric_type: row.metric_type,
      source_import_id: row.source_import_id,
    };
    if (row.value_numeric !== null) m.value_numeric = row.value_numeric;
    if (row.value_text) m.value_text = row.value_text;
    if (row.canonical_status) m.canonical_status = row.canonical_status;
    if (row.raw_status_code) m.raw_status_code = row.raw_status_code;
    if (row.reported_at) m.reported_at = row.reported_at;
    const ext = parseExtensions(row.extensions_json);
    if (ext) m.extensions = ext;
    return m;
  });
}

function buildTradelineEvents(db: AppDatabase, tradelineId: string): TradelineEvent[] {
  const rows = db
    .select()
    .from(tradelineEvent)
    .where(eq(tradelineEvent.tradeline_id, tradelineId))
    .all();

  return rows.map((row) => {
    const e: TradelineEvent = {
      event_id: row.event_id,
      event_type: row.event_type,
      event_date: row.event_date,
      source_import_id: row.source_import_id,
    };
    if (row.amount !== null) e.amount = row.amount;
    if (row.notes) e.notes = row.notes;
    const ext = parseExtensions(row.extensions_json);
    if (ext) e.extensions = ext;
    return e;
  });
}

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

function buildSearches(db: AppDatabase, importIds: string[]): SearchRecord[] {
  const rows = db
    .select()
    .from(searchRecord)
    .where(inArray(searchRecord.source_import_id, importIds))
    .all();

  return rows.map((row) => {
    const s: SearchRecord = {
      search_id: row.search_id,
      source_import_id: row.source_import_id,
    };
    if (row.searched_at) s.searched_at = row.searched_at;
    if (row.organisation_id) s.organisation_id = row.organisation_id;
    if (row.organisation_name_raw) s.organisation_name_raw = row.organisation_name_raw;
    if (row.search_type) s.search_type = row.search_type;
    if (row.visibility) s.visibility = row.visibility;
    const joint = optionalBool(row.joint_application);
    if (joint !== undefined) s.joint_application = joint;
    if (row.input_name) s.input_name = row.input_name;
    if (row.input_dob) s.input_dob = row.input_dob;
    if (row.input_address_id) s.input_address_id = row.input_address_id;
    if (row.reference) s.reference = row.reference;
    if (row.purpose_text) s.purpose_text = row.purpose_text;
    const ext = parseExtensions(row.extensions_json);
    if (ext) s.extensions = ext;
    return s;
  });
}

function buildCreditScores(db: AppDatabase, importIds: string[]): CreditScore[] {
  const rows = db
    .select()
    .from(creditScore)
    .where(inArray(creditScore.source_import_id, importIds))
    .all();

  return rows.map((row) => {
    const c: CreditScore = {
      score_id: row.score_id,
      source_import_id: row.source_import_id,
    };
    if (row.score_type) c.score_type = row.score_type;
    if (row.score_name) c.score_name = row.score_name;
    if (row.score_value !== null) c.score_value = row.score_value;
    if (row.score_min !== null) c.score_min = row.score_min;
    if (row.score_max !== null) c.score_max = row.score_max;
    if (row.score_band) c.score_band = row.score_band;
    if (row.calculated_at) c.calculated_at = row.calculated_at;
    const factors = parseJsonArray<string>(row.score_factors_json);
    if (factors) c.score_factors = factors;
    const ext = parseExtensions(row.extensions_json);
    if (ext) c.extensions = ext;
    return c;
  });
}

function buildPublicRecords(db: AppDatabase, importIds: string[]): PublicRecord[] {
  const rows = db
    .select()
    .from(publicRecord)
    .where(inArray(publicRecord.source_import_id, importIds))
    .all();

  return rows.map((row) => {
    const p: PublicRecord = {
      public_record_id: row.public_record_id,
      source_import_id: row.source_import_id,
    };
    if (row.record_type) p.record_type = row.record_type;
    if (row.court_or_register) p.court_or_register = row.court_or_register;
    if (row.amount !== null) p.amount = row.amount;
    if (row.recorded_at) p.recorded_at = row.recorded_at;
    if (row.satisfied_at) p.satisfied_at = row.satisfied_at;
    if (row.status) p.status = row.status;
    if (row.address_id) p.address_id = row.address_id;
    const ext = parseExtensions(row.extensions_json);
    if (ext) p.extensions = ext;
    return p;
  });
}

function buildNoticesOfCorrection(db: AppDatabase, importIds: string[]): NoticeOfCorrection[] {
  const rows = db
    .select()
    .from(noticeOfCorrection)
    .where(inArray(noticeOfCorrection.source_import_id, importIds))
    .all();

  return rows.map((row) => {
    const n: NoticeOfCorrection = {
      notice_id: row.notice_id,
      source_import_id: row.source_import_id,
    };
    if (row.text) n.text = row.text;
    if (row.created_at) n.created_at = row.created_at;
    if (row.expires_at) n.expires_at = row.expires_at;
    if (row.scope) n.scope = row.scope;
    if (row.scope_entity_id) n.scope_entity_id = row.scope_entity_id;
    const ext = parseExtensions(row.extensions_json);
    if (ext) n.extensions = ext;
    return n;
  });
}

function buildPropertyRecords(db: AppDatabase, importIds: string[]): PropertyRecord[] {
  const rows = db
    .select()
    .from(propertyRecord)
    .where(inArray(propertyRecord.source_import_id, importIds))
    .all();

  return rows.map((row) => {
    const p: PropertyRecord = {
      property_record_id: row.property_record_id,
      source_import_id: row.source_import_id,
    };
    if (row.address_id) p.address_id = row.address_id;
    if (row.property_type) p.property_type = row.property_type;
    if (row.price_paid !== null) p.price_paid = row.price_paid;
    if (row.deed_date) p.deed_date = row.deed_date;
    if (row.tenure) p.tenure = row.tenure;
    const newBuild = optionalBool(row.is_new_build);
    if (newBuild !== undefined) p.is_new_build = newBuild;
    const ext = parseExtensions(row.extensions_json);
    if (ext) p.extensions = ext;
    return p;
  });
}

function buildGoneAwayRecords(db: AppDatabase, importIds: string[]): GoneAwayRecord[] {
  const rows = db
    .select()
    .from(goneAwayRecord)
    .where(inArray(goneAwayRecord.source_import_id, importIds))
    .all();

  return rows.map((row) => {
    const g: GoneAwayRecord = {
      gone_away_id: row.gone_away_id,
      source_import_id: row.source_import_id,
    };
    if (row.network) g.network = row.network;
    if (row.recorded_at) g.recorded_at = row.recorded_at;
    if (row.old_address_id) g.old_address_id = row.old_address_id;
    if (row.new_address_id) g.new_address_id = row.new_address_id;
    if (row.notes) g.notes = row.notes;
    const ext = parseExtensions(row.extensions_json);
    if (ext) g.extensions = ext;
    return g;
  });
}

function buildFraudMarkers(db: AppDatabase, importIds: string[]): FraudMarker[] {
  const rows = db
    .select()
    .from(fraudMarker)
    .where(inArray(fraudMarker.source_import_id, importIds))
    .all();

  return rows.map((row) => {
    const f: FraudMarker = {
      fraud_marker_id: row.fraud_marker_id,
      source_import_id: row.source_import_id,
    };
    if (row.scheme) f.scheme = row.scheme;
    if (row.marker_type) f.marker_type = row.marker_type;
    if (row.placed_at) f.placed_at = row.placed_at;
    if (row.expires_at) f.expires_at = row.expires_at;
    if (row.address_scope) f.address_scope = row.address_scope;
    if (row.address_id) f.address_id = row.address_id;
    const ext = parseExtensions(row.extensions_json);
    if (ext) f.extensions = ext;
    return f;
  });
}

function buildAttributableItems(db: AppDatabase, importIds: string[]): AttributableItem[] {
  const rows = db
    .select()
    .from(attributableItem)
    .where(inArray(attributableItem.source_import_id, importIds))
    .all();

  return rows.map((row) => {
    const a: AttributableItem = {
      attributable_item_id: row.attributable_item_id,
      source_import_id: row.source_import_id,
    };
    if (row.entity_domain) a.entity_domain = row.entity_domain;
    if (row.linked_entity_id) a.linked_entity_id = row.linked_entity_id;
    if (row.summary) a.summary = row.summary;
    if (row.confidence) a.confidence = row.confidence;
    if (row.reason) a.reason = row.reason;
    const ext = parseExtensions(row.extensions_json);
    if (ext) a.extensions = ext;
    return a;
  });
}

function buildDisputes(db: AppDatabase, importIds: string[]): Dispute[] {
  const rows = db.select().from(dispute).where(inArray(dispute.source_import_id, importIds)).all();

  return rows.map((row) => {
    const d: Dispute = {
      dispute_id: row.dispute_id,
      source_import_id: row.source_import_id,
    };
    if (row.entity_domain) d.entity_domain = row.entity_domain;
    if (row.entity_id) d.entity_id = row.entity_id;
    if (row.opened_at) d.opened_at = row.opened_at;
    if (row.closed_at) d.closed_at = row.closed_at;
    if (row.status) d.status = row.status;
    if (row.notes) d.notes = row.notes;
    const ext = parseExtensions(row.extensions_json);
    if (ext) d.extensions = ext;
    return d;
  });
}
