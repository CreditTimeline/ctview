export type SourceSystem = 'equifax' | 'transunion' | 'experian' | 'other';
export type AcquisitionMethod = 'pdf_upload' | 'html_scrape' | 'api' | 'image' | 'other';
export type ConfidenceLevel = 'low' | 'medium' | 'high';
export type SubjectIdentifierType = 'provider_reference' | 'application_reference' | 'other';
export type NameType = 'legal' | 'alias' | 'historical' | 'other';
export type AddressAssociationRole =
  | 'current'
  | 'previous'
  | 'linked'
  | 'on_agreement'
  | 'search_input'
  | 'other';
export type FinancialAssociateRelationship = 'joint_account' | 'joint_application' | 'other';
export type FinancialAssociateStatus = 'active' | 'disputed' | 'removed' | 'unknown';
export type ElectoralChangeType = 'added' | 'amended' | 'deleted' | 'none' | 'unknown';
export type OrganisationRole = 'furnisher' | 'searcher' | 'court_source' | 'fraud_agency' | 'other';
export type IndustryType =
  | 'bank'
  | 'telecom'
  | 'utility'
  | 'insurer'
  | 'landlord'
  | 'government'
  | 'other';
export type TradelineAccountType =
  | 'credit_card'
  | 'mortgage'
  | 'secured_loan'
  | 'unsecured_loan'
  | 'current_account'
  | 'telecom'
  | 'utility'
  | 'rental'
  | 'budget_account'
  | 'insurance'
  | 'other'
  | 'unknown';
export type TradelineIdentifierType = 'masked_account_number' | 'provider_reference' | 'other';
export type TradelinePartyRole = 'primary' | 'secondary' | 'joint' | 'guarantor' | 'other';
export type TradelineTermType = 'revolving' | 'installment' | 'mortgage' | 'rental' | 'other';
export type TradelineMetricType =
  | 'payment_status'
  | 'balance'
  | 'credit_limit'
  | 'statement_balance'
  | 'payment_amount'
  | 'other';
export type CanonicalPaymentStatus =
  | 'up_to_date'
  | 'in_arrears'
  | 'arrangement'
  | 'settled'
  | 'default'
  | 'query'
  | 'gone_away'
  | 'no_update'
  | 'inactive'
  | 'written_off'
  | 'transferred'
  | 'repossession'
  | 'unknown';
export type TradelineEventType =
  | 'default'
  | 'delinquency'
  | 'satisfied'
  | 'settled'
  | 'arrangement_to_pay'
  | 'query'
  | 'gone_away'
  | 'written_off'
  | 'repossession'
  | 'other';
export type SearchType =
  | 'credit_application'
  | 'debt_collection'
  | 'quotation'
  | 'identity_check'
  | 'consumer_enquiry'
  | 'aml'
  | 'insurance_quote'
  | 'other';
export type SearchVisibility = 'hard' | 'soft' | 'unknown';
export type PublicRecordType =
  | 'ccj'
  | 'judgment'
  | 'bankruptcy'
  | 'iva'
  | 'dro'
  | 'administration_order'
  | 'other';
export type PublicRecordStatus = 'active' | 'satisfied' | 'set_aside' | 'discharged' | 'unknown';
export type NoticeScope = 'file' | 'address' | 'entity';
export type FraudScheme = 'cifas' | 'other';
export type FraudMarkerType = 'protective_registration' | 'victim_of_impersonation' | 'other';
export type FraudAddressScope = 'current' | 'previous' | 'linked' | 'file' | 'unknown';
export type AttributableEntityDomain =
  | 'tradeline'
  | 'search'
  | 'address'
  | 'public_record'
  | 'fraud_marker'
  | 'other';
export type DisputeEntityDomain =
  | 'tradeline'
  | 'search'
  | 'address'
  | 'public_record'
  | 'fraud_marker'
  | 'other';
export type DisputeStatus = 'open' | 'under_review' | 'resolved' | 'rejected' | 'withdrawn';
export type CreditScoreType = 'credit_score' | 'affordability' | 'stability' | 'custom' | 'other';
export type RawArtifactType = 'pdf' | 'html' | 'json' | 'image' | 'text' | 'other';
export type InsightSeverity = 'info' | 'low' | 'medium' | 'high';
export type IngestStatus = 'success' | 'partial' | 'failed';
