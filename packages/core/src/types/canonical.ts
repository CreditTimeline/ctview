/**
 * TypeScript types matching the CreditTimeline v1 JSON Schema.
 * These types represent the transport format (JSON payload),
 * not the database row types (which are in schema/types.ts).
 *
 * Each interface corresponds to a $defs entry in
 * spec/schemas/credittimeline-file.v1.schema.json
 */

// ---------------------------------------------------------------------------
// Top-level credit file
// ---------------------------------------------------------------------------

export interface CreditFile {
  schema_version: string;
  file_id: string;
  subject_id: string;
  created_at: string;
  currency_code?: string;
  imports: ImportBatch[];
  subject: Subject;
  organisations?: Organisation[];
  addresses?: Address[];
  address_associations?: AddressAssociation[];
  address_links?: AddressLink[];
  financial_associates?: FinancialAssociate[];
  electoral_roll_entries?: ElectoralRollEntry[];
  tradelines?: Tradeline[];
  searches?: SearchRecord[];
  credit_scores?: CreditScore[];
  public_records?: PublicRecord[];
  notices_of_correction?: NoticeOfCorrection[];
  property_records?: PropertyRecord[];
  gone_away_records?: GoneAwayRecord[];
  fraud_markers?: FraudMarker[];
  attributable_items?: AttributableItem[];
  disputes?: Dispute[];
  generated_insights?: GeneratedInsight[];
  extensions?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Provenance
// ---------------------------------------------------------------------------

export interface ImportBatch {
  import_id: string;
  imported_at: string;
  source_system: string;
  acquisition_method: string;
  currency_code?: string;
  source_wrapper?: string;
  mapping_version?: string;
  confidence_notes?: string;
  raw_artifacts?: RawArtifact[];
  extensions?: Record<string, unknown>;
}

export interface RawArtifact {
  artifact_id: string;
  artifact_type: string;
  sha256: string;
  uri?: string;
  embedded_base64?: string;
  extracted_text_ref?: string;
  extensions?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

export interface Subject {
  subject_id: string;
  names?: PersonName[];
  dates_of_birth?: DateOfBirthRecord[];
  identifiers?: SubjectIdentifier[];
  extensions?: Record<string, unknown>;
}

export interface PersonName {
  name_id: string;
  full_name?: string;
  title?: string;
  given_name?: string;
  middle_name?: string;
  family_name?: string;
  suffix?: string;
  name_type?: string;
  valid_from?: string;
  valid_to?: string;
  source_import_id: string;
  extensions?: Record<string, unknown>;
}

export interface DateOfBirthRecord {
  dob: string;
  source_import_id: string;
  confidence?: string;
  extensions?: Record<string, unknown>;
}

export interface SubjectIdentifier {
  identifier_id: string;
  identifier_type: string;
  value: string;
  source_import_id: string;
  extensions?: Record<string, unknown>;
}

export interface Address {
  address_id: string;
  line_1?: string;
  line_2?: string;
  line_3?: string;
  town_city?: string;
  county_region?: string;
  postcode?: string;
  country_code?: string;
  normalized_single_line?: string;
  extensions?: Record<string, unknown>;
}

export interface AddressAssociation {
  association_id: string;
  address_id: string;
  role?: string;
  valid_from?: string;
  valid_to?: string;
  source_import_id: string;
  extensions?: Record<string, unknown>;
}

export interface AddressLink {
  address_link_id: string;
  from_address_id: string;
  to_address_id: string;
  source_organisation_name?: string;
  last_confirmed_at?: string;
  source_import_id: string;
  extensions?: Record<string, unknown>;
}

export interface FinancialAssociate {
  associate_id: string;
  associate_name?: string;
  relationship_basis?: string;
  status?: string;
  confirmed_at?: string;
  source_import_id: string;
  extensions?: Record<string, unknown>;
}

export interface ElectoralRollEntry {
  electoral_entry_id: string;
  address_id?: string;
  name_on_register?: string;
  registered_from?: string;
  registered_to?: string;
  change_type?: string;
  marketing_opt_out?: boolean | null;
  source_import_id: string;
  extensions?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Organisations
// ---------------------------------------------------------------------------

export interface Organisation {
  organisation_id: string;
  name: string;
  roles?: string[];
  industry_type?: string;
  source_import_id?: string;
  extensions?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Tradelines and child entities
// ---------------------------------------------------------------------------

export interface Tradeline {
  tradeline_id: string;
  canonical_id?: string;
  furnisher_organisation_id?: string;
  furnisher_name_raw?: string;
  account_type?: string;
  opened_at?: string;
  closed_at?: string;
  status_current?: string;
  repayment_frequency?: string;
  regular_payment_amount?: number;
  supplementary_info?: string;
  identifiers?: TradelineIdentifier[];
  parties?: TradelineParty[];
  terms?: TradelineTerms;
  snapshots?: TradelineSnapshot[];
  monthly_metrics?: TradelineMonthlyMetric[];
  events?: TradelineEvent[];
  source_import_id: string;
  extensions?: Record<string, unknown>;
}

export interface TradelineIdentifier {
  identifier_id: string;
  identifier_type: string;
  value: string;
  source_import_id: string;
  extensions?: Record<string, unknown>;
}

export interface TradelineParty {
  party_id: string;
  party_role?: string;
  name?: string;
  source_import_id: string;
  extensions?: Record<string, unknown>;
}

export interface TradelineTerms {
  terms_id: string;
  term_type?: string;
  term_count?: number;
  term_payment_amount?: number;
  payment_start_date?: string;
  source_import_id: string;
  extensions?: Record<string, unknown>;
}

export interface TradelineSnapshot {
  snapshot_id: string;
  as_of_date?: string;
  status_current?: string;
  source_account_ref?: string;
  current_balance?: number;
  opening_balance?: number;
  credit_limit?: number;
  delinquent_balance?: number;
  payment_amount?: number;
  statement_balance?: number;
  minimum_payment_received?: boolean | null;
  cash_advance_amount?: number;
  cash_advance_count?: number;
  credit_limit_change?: string;
  promotional_rate_flag?: boolean | null;
  source_import_id: string;
  extensions?: Record<string, unknown>;
}

export interface TradelineMonthlyMetric {
  monthly_metric_id: string;
  period: string;
  metric_type: string;
  value_numeric?: number;
  value_text?: string;
  canonical_status?: string;
  raw_status_code?: string;
  reported_at?: string;
  source_import_id: string;
  extensions?: Record<string, unknown>;
}

export interface TradelineEvent {
  event_id: string;
  event_type: string;
  event_date: string;
  amount?: number;
  notes?: string;
  source_import_id: string;
  extensions?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

export interface SearchRecord {
  search_id: string;
  searched_at?: string;
  organisation_id?: string;
  organisation_name_raw?: string;
  search_type?: string;
  visibility?: string;
  joint_application?: boolean | null;
  input_name?: string;
  input_dob?: string;
  input_address_id?: string;
  reference?: string;
  purpose_text?: string;
  source_import_id: string;
  extensions?: Record<string, unknown>;
}

export interface CreditScore {
  score_id: string;
  score_type?: string;
  score_name?: string;
  score_value?: number;
  score_min?: number;
  score_max?: number;
  score_band?: string;
  calculated_at?: string;
  score_factors?: string[];
  source_import_id: string;
  extensions?: Record<string, unknown>;
}

export interface PublicRecord {
  public_record_id: string;
  record_type?: string;
  court_or_register?: string;
  amount?: number;
  recorded_at?: string;
  satisfied_at?: string;
  status?: string;
  address_id?: string;
  source_import_id: string;
  extensions?: Record<string, unknown>;
}

export interface NoticeOfCorrection {
  notice_id: string;
  text?: string;
  created_at?: string;
  expires_at?: string;
  scope?: string;
  scope_entity_id?: string;
  source_import_id: string;
  extensions?: Record<string, unknown>;
}

export interface PropertyRecord {
  property_record_id: string;
  address_id?: string;
  property_type?: string;
  price_paid?: number;
  deed_date?: string;
  tenure?: string;
  is_new_build?: boolean | null;
  source_import_id: string;
  extensions?: Record<string, unknown>;
}

export interface GoneAwayRecord {
  gone_away_id: string;
  network?: string;
  recorded_at?: string;
  old_address_id?: string;
  new_address_id?: string;
  notes?: string;
  source_import_id: string;
  extensions?: Record<string, unknown>;
}

export interface FraudMarker {
  fraud_marker_id: string;
  scheme?: string;
  marker_type?: string;
  placed_at?: string;
  expires_at?: string;
  address_scope?: string;
  address_id?: string;
  source_import_id: string;
  extensions?: Record<string, unknown>;
}

export interface AttributableItem {
  attributable_item_id: string;
  entity_domain?: string;
  linked_entity_id?: string;
  summary?: string;
  confidence?: string;
  reason?: string;
  source_import_id: string;
  extensions?: Record<string, unknown>;
}

export interface Dispute {
  dispute_id: string;
  entity_domain?: string;
  entity_id?: string;
  opened_at?: string;
  closed_at?: string;
  status?: string;
  notes?: string;
  source_import_id: string;
  extensions?: Record<string, unknown>;
}

export interface GeneratedInsight {
  insight_id: string;
  kind: string;
  summary?: string;
  linked_entity_ids?: string[];
  generated_at: string;
  extensions?: Record<string, unknown>;
}
