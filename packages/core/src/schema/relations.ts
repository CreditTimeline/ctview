import { relations } from 'drizzle-orm';
import { subject, creditFile, importBatch, rawArtifact } from './sqlite/provenance.js';
import {
  personName,
  subjectIdentifier,
  address,
  addressAssociation,
  addressLink,
  financialAssociate,
  electoralRollEntry,
} from './sqlite/identity.js';
import {
  organisation,
  tradeline,
  tradelineIdentifier,
  tradelineParty,
  tradelineTerms,
  tradelineSnapshot,
  tradelineMonthlyMetric,
  tradelineEvent,
} from './sqlite/tradelines.js';
import {
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

// --- Subject relations ---

export const subjectRelations = relations(subject, ({ many }) => ({
  creditFiles: many(creditFile),
  importBatches: many(importBatch),
  personNames: many(personName),
  subjectIdentifiers: many(subjectIdentifier),
  addressAssociations: many(addressAssociation),
  addressLinks: many(addressLink),
  financialAssociates: many(financialAssociate),
  electoralRollEntries: many(electoralRollEntry),
  organisations: many(organisation),
  tradelines: many(tradeline),
  searchRecords: many(searchRecord),
  creditScores: many(creditScore),
  publicRecords: many(publicRecord),
  noticesOfCorrection: many(noticeOfCorrection),
  propertyRecords: many(propertyRecord),
  goneAwayRecords: many(goneAwayRecord),
  fraudMarkers: many(fraudMarker),
  attributableItems: many(attributableItem),
  disputes: many(dispute),
  generatedInsights: many(generatedInsight),
}));

// --- Credit file relations ---

export const creditFileRelations = relations(creditFile, ({ one, many }) => ({
  subject: one(subject, {
    fields: [creditFile.subject_id],
    references: [subject.subject_id],
  }),
  importBatches: many(importBatch),
}));

// --- Import batch relations ---

export const importBatchRelations = relations(importBatch, ({ one, many }) => ({
  creditFile: one(creditFile, {
    fields: [importBatch.file_id],
    references: [creditFile.file_id],
  }),
  subject: one(subject, {
    fields: [importBatch.subject_id],
    references: [subject.subject_id],
  }),
  rawArtifacts: many(rawArtifact),
}));

// --- Raw artifact relations ---

export const rawArtifactRelations = relations(rawArtifact, ({ one }) => ({
  importBatch: one(importBatch, {
    fields: [rawArtifact.import_id],
    references: [importBatch.import_id],
  }),
}));

// --- Person name relations ---

export const personNameRelations = relations(personName, ({ one }) => ({
  subject: one(subject, {
    fields: [personName.subject_id],
    references: [subject.subject_id],
  }),
  sourceImport: one(importBatch, {
    fields: [personName.source_import_id],
    references: [importBatch.import_id],
  }),
}));

// --- Subject identifier relations ---

export const subjectIdentifierRelations = relations(subjectIdentifier, ({ one }) => ({
  subject: one(subject, {
    fields: [subjectIdentifier.subject_id],
    references: [subject.subject_id],
  }),
  sourceImport: one(importBatch, {
    fields: [subjectIdentifier.source_import_id],
    references: [importBatch.import_id],
  }),
}));

// --- Address association relations ---

export const addressAssociationRelations = relations(addressAssociation, ({ one }) => ({
  subject: one(subject, {
    fields: [addressAssociation.subject_id],
    references: [subject.subject_id],
  }),
  address: one(address, {
    fields: [addressAssociation.address_id],
    references: [address.address_id],
  }),
  sourceImport: one(importBatch, {
    fields: [addressAssociation.source_import_id],
    references: [importBatch.import_id],
  }),
}));

// --- Organisation relations ---

export const organisationRelations = relations(organisation, ({ one, many }) => ({
  subject: one(subject, {
    fields: [organisation.subject_id],
    references: [subject.subject_id],
  }),
  sourceImport: one(importBatch, {
    fields: [organisation.source_import_id],
    references: [importBatch.import_id],
  }),
  tradelines: many(tradeline),
  searchRecords: many(searchRecord),
}));

// --- Tradeline relations ---

export const tradelineRelations = relations(tradeline, ({ one, many }) => ({
  subject: one(subject, {
    fields: [tradeline.subject_id],
    references: [subject.subject_id],
  }),
  furnisherOrganisation: one(organisation, {
    fields: [tradeline.furnisher_organisation_id],
    references: [organisation.organisation_id],
  }),
  sourceImport: one(importBatch, {
    fields: [tradeline.source_import_id],
    references: [importBatch.import_id],
  }),
  identifiers: many(tradelineIdentifier),
  parties: many(tradelineParty),
  terms: many(tradelineTerms),
  snapshots: many(tradelineSnapshot),
  monthlyMetrics: many(tradelineMonthlyMetric),
  events: many(tradelineEvent),
}));

// --- Tradeline identifier relations ---

export const tradelineIdentifierRelations = relations(tradelineIdentifier, ({ one }) => ({
  tradeline: one(tradeline, {
    fields: [tradelineIdentifier.tradeline_id],
    references: [tradeline.tradeline_id],
  }),
  sourceImport: one(importBatch, {
    fields: [tradelineIdentifier.source_import_id],
    references: [importBatch.import_id],
  }),
}));

// --- Tradeline party relations ---

export const tradelinePartyRelations = relations(tradelineParty, ({ one }) => ({
  tradeline: one(tradeline, {
    fields: [tradelineParty.tradeline_id],
    references: [tradeline.tradeline_id],
  }),
  sourceImport: one(importBatch, {
    fields: [tradelineParty.source_import_id],
    references: [importBatch.import_id],
  }),
}));

// --- Tradeline terms relations ---

export const tradelineTermsRelations = relations(tradelineTerms, ({ one }) => ({
  tradeline: one(tradeline, {
    fields: [tradelineTerms.tradeline_id],
    references: [tradeline.tradeline_id],
  }),
  sourceImport: one(importBatch, {
    fields: [tradelineTerms.source_import_id],
    references: [importBatch.import_id],
  }),
}));

// --- Tradeline snapshot relations ---

export const tradelineSnapshotRelations = relations(tradelineSnapshot, ({ one }) => ({
  tradeline: one(tradeline, {
    fields: [tradelineSnapshot.tradeline_id],
    references: [tradeline.tradeline_id],
  }),
  sourceImport: one(importBatch, {
    fields: [tradelineSnapshot.source_import_id],
    references: [importBatch.import_id],
  }),
}));

// --- Tradeline monthly metric relations ---

export const tradelineMonthlyMetricRelations = relations(tradelineMonthlyMetric, ({ one }) => ({
  tradeline: one(tradeline, {
    fields: [tradelineMonthlyMetric.tradeline_id],
    references: [tradeline.tradeline_id],
  }),
  sourceImport: one(importBatch, {
    fields: [tradelineMonthlyMetric.source_import_id],
    references: [importBatch.import_id],
  }),
}));

// --- Tradeline event relations ---

export const tradelineEventRelations = relations(tradelineEvent, ({ one }) => ({
  tradeline: one(tradeline, {
    fields: [tradelineEvent.tradeline_id],
    references: [tradeline.tradeline_id],
  }),
  sourceImport: one(importBatch, {
    fields: [tradelineEvent.source_import_id],
    references: [importBatch.import_id],
  }),
}));

// --- Search record relations ---

export const searchRecordRelations = relations(searchRecord, ({ one }) => ({
  subject: one(subject, {
    fields: [searchRecord.subject_id],
    references: [subject.subject_id],
  }),
  organisation: one(organisation, {
    fields: [searchRecord.organisation_id],
    references: [organisation.organisation_id],
  }),
  inputAddress: one(address, {
    fields: [searchRecord.input_address_id],
    references: [address.address_id],
  }),
  sourceImport: one(importBatch, {
    fields: [searchRecord.source_import_id],
    references: [importBatch.import_id],
  }),
}));

// --- Credit score relations ---

export const creditScoreRelations = relations(creditScore, ({ one }) => ({
  subject: one(subject, {
    fields: [creditScore.subject_id],
    references: [subject.subject_id],
  }),
  sourceImport: one(importBatch, {
    fields: [creditScore.source_import_id],
    references: [importBatch.import_id],
  }),
}));

// --- Public record relations ---

export const publicRecordRelations = relations(publicRecord, ({ one }) => ({
  subject: one(subject, {
    fields: [publicRecord.subject_id],
    references: [subject.subject_id],
  }),
  address: one(address, {
    fields: [publicRecord.address_id],
    references: [address.address_id],
  }),
  sourceImport: one(importBatch, {
    fields: [publicRecord.source_import_id],
    references: [importBatch.import_id],
  }),
}));

// --- Notice of correction relations ---

export const noticeOfCorrectionRelations = relations(noticeOfCorrection, ({ one }) => ({
  subject: one(subject, {
    fields: [noticeOfCorrection.subject_id],
    references: [subject.subject_id],
  }),
  sourceImport: one(importBatch, {
    fields: [noticeOfCorrection.source_import_id],
    references: [importBatch.import_id],
  }),
}));

// --- Property record relations ---

export const propertyRecordRelations = relations(propertyRecord, ({ one }) => ({
  subject: one(subject, {
    fields: [propertyRecord.subject_id],
    references: [subject.subject_id],
  }),
  address: one(address, {
    fields: [propertyRecord.address_id],
    references: [address.address_id],
  }),
  sourceImport: one(importBatch, {
    fields: [propertyRecord.source_import_id],
    references: [importBatch.import_id],
  }),
}));

// --- Gone away record relations ---

export const goneAwayRecordRelations = relations(goneAwayRecord, ({ one }) => ({
  subject: one(subject, {
    fields: [goneAwayRecord.subject_id],
    references: [subject.subject_id],
  }),
  sourceImport: one(importBatch, {
    fields: [goneAwayRecord.source_import_id],
    references: [importBatch.import_id],
  }),
}));

// --- Fraud marker relations ---

export const fraudMarkerRelations = relations(fraudMarker, ({ one }) => ({
  subject: one(subject, {
    fields: [fraudMarker.subject_id],
    references: [subject.subject_id],
  }),
  address: one(address, {
    fields: [fraudMarker.address_id],
    references: [address.address_id],
  }),
  sourceImport: one(importBatch, {
    fields: [fraudMarker.source_import_id],
    references: [importBatch.import_id],
  }),
}));

// --- Attributable item relations ---

export const attributableItemRelations = relations(attributableItem, ({ one }) => ({
  subject: one(subject, {
    fields: [attributableItem.subject_id],
    references: [subject.subject_id],
  }),
  sourceImport: one(importBatch, {
    fields: [attributableItem.source_import_id],
    references: [importBatch.import_id],
  }),
}));

// --- Dispute relations ---

export const disputeRelations = relations(dispute, ({ one }) => ({
  subject: one(subject, {
    fields: [dispute.subject_id],
    references: [subject.subject_id],
  }),
  sourceImport: one(importBatch, {
    fields: [dispute.source_import_id],
    references: [importBatch.import_id],
  }),
}));

// --- Generated insight relations ---

export const generatedInsightRelations = relations(generatedInsight, ({ one, many }) => ({
  subject: one(subject, {
    fields: [generatedInsight.subject_id],
    references: [subject.subject_id],
  }),
  sourceImport: one(importBatch, {
    fields: [generatedInsight.source_import_id],
    references: [importBatch.import_id],
  }),
  entities: many(generatedInsightEntity),
}));

// --- Generated insight entity relations ---

export const generatedInsightEntityRelations = relations(generatedInsightEntity, ({ one }) => ({
  insight: one(generatedInsight, {
    fields: [generatedInsightEntity.insight_id],
    references: [generatedInsight.insight_id],
  }),
}));
