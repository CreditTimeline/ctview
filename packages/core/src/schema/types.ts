import type {
  schemaVersion,
  subject,
  creditFile,
  importBatch,
  rawArtifact,
} from './sqlite/provenance.js';
import type {
  personName,
  subjectIdentifier,
  address,
  addressAssociation,
  addressLink,
  financialAssociate,
  electoralRollEntry,
} from './sqlite/identity.js';
import type {
  organisation,
  tradeline,
  tradelineIdentifier,
  tradelineParty,
  tradelineTerms,
  tradelineSnapshot,
  tradelineMonthlyMetric,
  tradelineEvent,
} from './sqlite/tradelines.js';
import type {
  searchRecord,
  creditScore,
  publicRecord,
  noticeOfCorrection,
  propertyRecord,
  goneAwayRecord,
  fraudMarker,
  attributableItem,
  dispute,
  generatedInsight,
  generatedInsightEntity,
} from './sqlite/records.js';
import type { ingestReceipt, auditLog, appSettings } from './sqlite/app.js';

// --- Select (row read) types ---

export type SchemaVersionRow = typeof schemaVersion.$inferSelect;
export type SubjectRow = typeof subject.$inferSelect;
export type CreditFileRow = typeof creditFile.$inferSelect;
export type ImportBatchRow = typeof importBatch.$inferSelect;
export type RawArtifactRow = typeof rawArtifact.$inferSelect;

export type PersonNameRow = typeof personName.$inferSelect;
export type SubjectIdentifierRow = typeof subjectIdentifier.$inferSelect;
export type AddressRow = typeof address.$inferSelect;
export type AddressAssociationRow = typeof addressAssociation.$inferSelect;
export type AddressLinkRow = typeof addressLink.$inferSelect;
export type FinancialAssociateRow = typeof financialAssociate.$inferSelect;
export type ElectoralRollEntryRow = typeof electoralRollEntry.$inferSelect;

export type OrganisationRow = typeof organisation.$inferSelect;
export type TradelineRow = typeof tradeline.$inferSelect;
export type TradelineIdentifierRow = typeof tradelineIdentifier.$inferSelect;
export type TradelinePartyRow = typeof tradelineParty.$inferSelect;
export type TradelineTermsRow = typeof tradelineTerms.$inferSelect;
export type TradelineSnapshotRow = typeof tradelineSnapshot.$inferSelect;
export type TradelineMonthlyMetricRow = typeof tradelineMonthlyMetric.$inferSelect;
export type TradelineEventRow = typeof tradelineEvent.$inferSelect;

export type SearchRecordRow = typeof searchRecord.$inferSelect;
export type CreditScoreRow = typeof creditScore.$inferSelect;
export type PublicRecordRow = typeof publicRecord.$inferSelect;
export type NoticeOfCorrectionRow = typeof noticeOfCorrection.$inferSelect;
export type PropertyRecordRow = typeof propertyRecord.$inferSelect;
export type GoneAwayRecordRow = typeof goneAwayRecord.$inferSelect;
export type FraudMarkerRow = typeof fraudMarker.$inferSelect;
export type AttributableItemRow = typeof attributableItem.$inferSelect;
export type DisputeRow = typeof dispute.$inferSelect;
export type GeneratedInsightRow = typeof generatedInsight.$inferSelect;
export type GeneratedInsightEntityRow = typeof generatedInsightEntity.$inferSelect;

export type IngestReceiptRow = typeof ingestReceipt.$inferSelect;
export type AuditLogRow = typeof auditLog.$inferSelect;
export type AppSettingsRow = typeof appSettings.$inferSelect;

// --- Insert types ---

export type SchemaVersionInsert = typeof schemaVersion.$inferInsert;
export type SubjectInsert = typeof subject.$inferInsert;
export type CreditFileInsert = typeof creditFile.$inferInsert;
export type ImportBatchInsert = typeof importBatch.$inferInsert;
export type RawArtifactInsert = typeof rawArtifact.$inferInsert;

export type PersonNameInsert = typeof personName.$inferInsert;
export type SubjectIdentifierInsert = typeof subjectIdentifier.$inferInsert;
export type AddressInsert = typeof address.$inferInsert;
export type AddressAssociationInsert = typeof addressAssociation.$inferInsert;
export type AddressLinkInsert = typeof addressLink.$inferInsert;
export type FinancialAssociateInsert = typeof financialAssociate.$inferInsert;
export type ElectoralRollEntryInsert = typeof electoralRollEntry.$inferInsert;

export type OrganisationInsert = typeof organisation.$inferInsert;
export type TradelineInsert = typeof tradeline.$inferInsert;
export type TradelineIdentifierInsert = typeof tradelineIdentifier.$inferInsert;
export type TradelinePartyInsert = typeof tradelineParty.$inferInsert;
export type TradelineTermsInsert = typeof tradelineTerms.$inferInsert;
export type TradelineSnapshotInsert = typeof tradelineSnapshot.$inferInsert;
export type TradelineMonthlyMetricInsert = typeof tradelineMonthlyMetric.$inferInsert;
export type TradelineEventInsert = typeof tradelineEvent.$inferInsert;

export type SearchRecordInsert = typeof searchRecord.$inferInsert;
export type CreditScoreInsert = typeof creditScore.$inferInsert;
export type PublicRecordInsert = typeof publicRecord.$inferInsert;
export type NoticeOfCorrectionInsert = typeof noticeOfCorrection.$inferInsert;
export type PropertyRecordInsert = typeof propertyRecord.$inferInsert;
export type GoneAwayRecordInsert = typeof goneAwayRecord.$inferInsert;
export type FraudMarkerInsert = typeof fraudMarker.$inferInsert;
export type AttributableItemInsert = typeof attributableItem.$inferInsert;
export type DisputeInsert = typeof dispute.$inferInsert;
export type GeneratedInsightInsert = typeof generatedInsight.$inferInsert;
export type GeneratedInsightEntityInsert = typeof generatedInsightEntity.$inferInsert;

export type IngestReceiptInsert = typeof ingestReceipt.$inferInsert;
export type AuditLogInsert = typeof auditLog.$inferInsert;
export type AppSettingsInsert = typeof appSettings.$inferInsert;
