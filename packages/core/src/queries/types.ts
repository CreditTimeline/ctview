import 'zod-openapi';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export const paginationSchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(200).default(50),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .meta({ id: 'PaginationParams' });

export type PaginationParams = z.infer<typeof paginationSchema>;

export function paginatedResultSchema<T extends z.ZodType>(itemSchema: T) {
  return z.object({
    items: z.array(itemSchema),
    total: z.number(),
    limit: z.number(),
    offset: z.number(),
  });
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export const entityCountsSchema = z
  .object({
    tradelines: z.number(),
    imports: z.number(),
    searches: z.number(),
    scores: z.number(),
    publicRecords: z.number(),
    addresses: z.number(),
    fraudMarkers: z.number(),
    disputes: z.number(),
    insights: z.number(),
  })
  .meta({ id: 'EntityCounts' });

export type EntityCounts = z.infer<typeof entityCountsSchema>;

export const latestScoreSchema = z
  .object({
    scoreId: z.string(),
    sourceSystem: z.string(),
    scoreValue: z.number().nullable(),
    scoreMin: z.number().nullable(),
    scoreMax: z.number().nullable(),
    scoreBand: z.string().nullable(),
    calculatedAt: z.string().nullable(),
  })
  .meta({ id: 'LatestScore' });

export type LatestScore = z.infer<typeof latestScoreSchema>;

export const debtSummarySchema = z
  .object({
    totalBalance: z.number(),
    totalCreditLimit: z.number(),
    openTradelineCount: z.number(),
  })
  .meta({ id: 'DebtSummary' });

export type DebtSummary = z.infer<typeof debtSummarySchema>;

export const recentImportSchema = z
  .object({
    importId: z.string(),
    importedAt: z.string(),
    sourceSystem: z.string(),
    acquisitionMethod: z.string(),
    entityCounts: z.record(z.string(), z.number()).nullable(),
  })
  .meta({ id: 'RecentImport' });

export type RecentImport = z.infer<typeof recentImportSchema>;

export const dashboardDataSchema = z
  .object({
    counts: entityCountsSchema,
    latestScores: z.array(latestScoreSchema),
    debtSummary: debtSummarySchema,
    recentImports: z.array(recentImportSchema),
  })
  .meta({ id: 'DashboardData' });

export type DashboardData = z.infer<typeof dashboardDataSchema>;

// ---------------------------------------------------------------------------
// Subjects
// ---------------------------------------------------------------------------

export const subjectListItemSchema = z
  .object({
    subjectId: z.string(),
    createdAt: z.string(),
    primaryName: z.string().nullable(),
    tradelineCount: z.number(),
    latestImportAt: z.string().nullable(),
  })
  .meta({ id: 'SubjectListItem' });

export type SubjectListItem = z.infer<typeof subjectListItemSchema>;

export const subjectSummarySchema = z
  .object({
    subjectId: z.string(),
    createdAt: z.string(),
    names: z.array(
      z.object({
        nameId: z.string(),
        fullName: z.string().nullable(),
        nameType: z.string().nullable(),
      }),
    ),
    activeTradelineCount: z.number(),
    closedTradelineCount: z.number(),
    publicRecordCount: z.number(),
    fraudMarkerCount: z.number(),
    latestScores: z.array(latestScoreSchema),
    lastImportAt: z.string().nullable(),
    insightCount: z.number(),
  })
  .meta({ id: 'SubjectSummary' });

export type SubjectSummary = z.infer<typeof subjectSummarySchema>;

// ---------------------------------------------------------------------------
// Tradelines
// ---------------------------------------------------------------------------

export const tradelineListSchema = paginationSchema
  .extend({
    subjectId: z.string().optional(),
    accountType: z.string().optional(),
    status: z.string().optional(),
    sourceSystem: z.string().optional(),
  })
  .meta({ id: 'TradelineListParams' });

export type TradelineListParams = z.infer<typeof tradelineListSchema>;

export const tradelineSummarySchema = z
  .object({
    tradelineId: z.string(),
    canonicalId: z.string().nullable(),
    furnisherName: z.string().nullable(),
    accountType: z.string().nullable(),
    openedAt: z.string().nullable(),
    closedAt: z.string().nullable(),
    statusCurrent: z.string().nullable(),
    sourceSystem: z.string(),
    latestBalance: z.number().nullable(),
    latestCreditLimit: z.number().nullable(),
    latestSnapshotDate: z.string().nullable(),
  })
  .meta({ id: 'TradelineSummary' });

export type TradelineSummary = z.infer<typeof tradelineSummarySchema>;

export const tradelineDetailSchema = z
  .object({
    tradelineId: z.string(),
    canonicalId: z.string().nullable(),
    subjectId: z.string(),
    furnisherName: z.string().nullable(),
    furnisherNameRaw: z.string().nullable(),
    accountType: z.string().nullable(),
    openedAt: z.string().nullable(),
    closedAt: z.string().nullable(),
    statusCurrent: z.string().nullable(),
    repaymentFrequency: z.string().nullable(),
    regularPaymentAmount: z.number().nullable(),
    sourceSystem: z.string(),
    identifiers: z.array(
      z.object({
        identifierId: z.string(),
        identifierType: z.string(),
        value: z.string(),
      }),
    ),
    parties: z.array(
      z.object({
        partyId: z.string(),
        partyRole: z.string().nullable(),
        name: z.string().nullable(),
      }),
    ),
    terms: z.array(
      z.object({
        termsId: z.string(),
        termType: z.string().nullable(),
        termCount: z.number().nullable(),
        termPaymentAmount: z.number().nullable(),
        paymentStartDate: z.string().nullable(),
      }),
    ),
    snapshots: z.array(
      z.object({
        snapshotId: z.string(),
        asOfDate: z.string().nullable(),
        statusCurrent: z.string().nullable(),
        currentBalance: z.number().nullable(),
        openingBalance: z.number().nullable(),
        creditLimit: z.number().nullable(),
        delinquentBalance: z.number().nullable(),
        paymentAmount: z.number().nullable(),
      }),
    ),
    events: z.array(
      z.object({
        eventId: z.string(),
        eventType: z.string(),
        eventDate: z.string(),
        amount: z.number().nullable(),
        notes: z.string().nullable(),
      }),
    ),
    crossAgencyPeers: z.array(
      z.object({
        tradelineId: z.string(),
        sourceSystem: z.string(),
        furnisherName: z.string().nullable(),
      }),
    ),
  })
  .meta({ id: 'TradelineDetail' });

export type TradelineDetail = z.infer<typeof tradelineDetailSchema>;

export const tradelineMetricsSchema = paginationSchema
  .extend({
    metricType: z.string().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
  })
  .meta({ id: 'TradelineMetricsParams' });

export type TradelineMetricsParams = z.infer<typeof tradelineMetricsSchema>;

export const metricDataPointSchema = z
  .object({
    monthlyMetricId: z.string(),
    period: z.string(),
    metricType: z.string(),
    valueNumeric: z.number().nullable(),
    valueText: z.string().nullable(),
    canonicalStatus: z.string().nullable(),
  })
  .meta({ id: 'MetricDataPoint' });

export type MetricDataPoint = z.infer<typeof metricDataPointSchema>;

export const tradelineMetricSeriesSchema = z
  .object({
    tradelineId: z.string(),
    metrics: z.array(metricDataPointSchema),
  })
  .meta({ id: 'TradelineMetricSeries' });

export type TradelineMetricSeries = z.infer<typeof tradelineMetricSeriesSchema>;

// ---------------------------------------------------------------------------
// Searches
// ---------------------------------------------------------------------------

export const searchListSchema = paginationSchema
  .extend({
    subjectId: z.string().optional(),
    visibility: z.string().optional(),
    searchType: z.string().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
  })
  .meta({ id: 'SearchListParams' });

export type SearchListParams = z.infer<typeof searchListSchema>;

export const searchSummarySchema = z
  .object({
    searchId: z.string(),
    searchedAt: z.string().nullable(),
    organisationName: z.string().nullable(),
    searchType: z.string().nullable(),
    visibility: z.string().nullable(),
    purposeText: z.string().nullable(),
  })
  .meta({ id: 'SearchSummary' });

export type SearchSummary = z.infer<typeof searchSummarySchema>;

export const searchTimelineBucketSchema = z
  .object({
    month: z.string(),
    count: z.number(),
  })
  .meta({ id: 'SearchTimelineBucket' });

export type SearchTimelineBucket = z.infer<typeof searchTimelineBucketSchema>;

export const searchTimelineDataSchema = z
  .object({
    hardSearches: z.array(searchTimelineBucketSchema),
    softSearches: z.array(searchTimelineBucketSchema),
  })
  .meta({ id: 'SearchTimelineData' });

export type SearchTimelineData = z.infer<typeof searchTimelineDataSchema>;

export const searchFrequencyItemSchema = z
  .object({
    organisationName: z.string().nullable(),
    searchType: z.string().nullable(),
    count: z.number(),
  })
  .meta({ id: 'SearchFrequencyItem' });

export type SearchFrequencyItem = z.infer<typeof searchFrequencyItemSchema>;

export const searchFrequencyDataSchema = z
  .object({
    items: z.array(searchFrequencyItemSchema),
  })
  .meta({ id: 'SearchFrequencyData' });

export type SearchFrequencyData = z.infer<typeof searchFrequencyDataSchema>;

// ---------------------------------------------------------------------------
// Scores
// ---------------------------------------------------------------------------

export const scoreListSchema = paginationSchema
  .extend({
    subjectId: z.string().optional(),
    sourceSystem: z.string().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
  })
  .meta({ id: 'ScoreListParams' });

export type ScoreListParams = z.infer<typeof scoreListSchema>;

export const scoreEntrySchema = z
  .object({
    scoreId: z.string(),
    scoreType: z.string().nullable(),
    scoreName: z.string().nullable(),
    scoreValue: z.number().nullable(),
    scoreMin: z.number().nullable(),
    scoreMax: z.number().nullable(),
    scoreBand: z.string().nullable(),
    calculatedAt: z.string().nullable(),
    sourceSystem: z.string(),
    scoreFactors: z.array(z.string()),
  })
  .meta({ id: 'ScoreEntry' });

export type ScoreEntry = z.infer<typeof scoreEntrySchema>;

export const scoreTrendPointSchema = z
  .object({
    scoreId: z.string(),
    scoreValue: z.number().nullable(),
    calculatedAt: z.string().nullable(),
    sourceSystem: z.string(),
  })
  .meta({ id: 'ScoreTrendPoint' });

export type ScoreTrendPoint = z.infer<typeof scoreTrendPointSchema>;

export const scoreTrendDataSchema = z
  .object({
    series: z.record(z.string(), z.array(scoreTrendPointSchema)),
  })
  .meta({ id: 'ScoreTrendData' });

export type ScoreTrendData = z.infer<typeof scoreTrendDataSchema>;

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

export const importListSchema = paginationSchema
  .extend({
    subjectId: z.string().optional(),
  })
  .meta({ id: 'ImportListParams' });

export type ImportListParams = z.infer<typeof importListSchema>;

export const importListItemSchema = z
  .object({
    importId: z.string(),
    fileId: z.string(),
    subjectId: z.string(),
    importedAt: z.string(),
    sourceSystem: z.string(),
    acquisitionMethod: z.string(),
    status: z.string().nullable(),
    durationMs: z.number().nullable(),
    entityCounts: z.record(z.string(), z.number()).nullable(),
  })
  .meta({ id: 'ImportListItem' });

export type ImportListItem = z.infer<typeof importListItemSchema>;

export const importDetailSchema = z
  .object({
    importId: z.string(),
    fileId: z.string(),
    subjectId: z.string(),
    importedAt: z.string(),
    sourceSystem: z.string(),
    acquisitionMethod: z.string(),
    sourceWrapper: z.string().nullable(),
    mappingVersion: z.string().nullable(),
    confidenceNotes: z.string().nullable(),
    rawArtifacts: z.array(
      z.object({
        artifactId: z.string(),
        artifactType: z.string(),
        sha256: z.string(),
        uri: z.string().nullable(),
      }),
    ),
    receipt: z
      .object({
        receiptId: z.string(),
        status: z.string(),
        durationMs: z.number().nullable(),
        entityCounts: z.record(z.string(), z.number()).nullable(),
        ingestedAt: z.string(),
      })
      .nullable(),
  })
  .meta({ id: 'ImportDetail' });

export type ImportDetail = z.infer<typeof importDetailSchema>;

export const importDiffDeltaSchema = z
  .object({
    entityType: z.string(),
    countA: z.number(),
    countB: z.number(),
    delta: z.number(),
  })
  .meta({ id: 'ImportDiffDelta' });

export type ImportDiffDelta = z.infer<typeof importDiffDeltaSchema>;

export const importDiffSchema = z
  .object({
    importIdA: z.string(),
    importIdB: z.string(),
    deltas: z.array(importDiffDeltaSchema),
  })
  .meta({ id: 'ImportDiff' });

export type ImportDiff = z.infer<typeof importDiffSchema>;

// ---------------------------------------------------------------------------
// Addresses
// ---------------------------------------------------------------------------

export const addressListSchema = paginationSchema
  .extend({
    subjectId: z.string().optional(),
    role: z.string().optional(),
  })
  .meta({ id: 'AddressListParams' });

export type AddressListParams = z.infer<typeof addressListSchema>;

export const addressWithAssociationsSchema = z
  .object({
    addressId: z.string(),
    line1: z.string().nullable(),
    line2: z.string().nullable(),
    line3: z.string().nullable(),
    townCity: z.string().nullable(),
    countyRegion: z.string().nullable(),
    postcode: z.string().nullable(),
    countryCode: z.string().nullable(),
    normalizedSingleLine: z.string().nullable(),
    associations: z.array(
      z.object({
        associationId: z.string(),
        role: z.string().nullable(),
        validFrom: z.string().nullable(),
        validTo: z.string().nullable(),
      }),
    ),
    electoralRollEntries: z.array(
      z.object({
        electoralEntryId: z.string(),
        nameOnRegister: z.string().nullable(),
        registeredFrom: z.string().nullable(),
        registeredTo: z.string().nullable(),
      }),
    ),
  })
  .meta({ id: 'AddressWithAssociations' });

export type AddressWithAssociations = z.infer<typeof addressWithAssociationsSchema>;

export const addressLinkEntrySchema = z
  .object({
    linkId: z.string(),
    fromAddress: z.string(),
    toAddress: z.string(),
    linkedAt: z.string().nullable(),
    sourceSystem: z.string(),
  })
  .meta({ id: 'AddressLinkEntry' });

export type AddressLinkEntry = z.infer<typeof addressLinkEntrySchema>;

// ---------------------------------------------------------------------------
// Public Records
// ---------------------------------------------------------------------------

export const publicRecordListSchema = paginationSchema
  .extend({
    subjectId: z.string().optional(),
  })
  .meta({ id: 'PublicRecordListParams' });

export type PublicRecordListParams = z.infer<typeof publicRecordListSchema>;

export const publicRecordSummarySchema = z
  .object({
    publicRecordId: z.string(),
    recordType: z.string().nullable(),
    courtOrRegister: z.string().nullable(),
    amount: z.number().nullable(),
    recordedAt: z.string().nullable(),
    satisfiedAt: z.string().nullable(),
    status: z.string().nullable(),
    sourceSystem: z.string(),
  })
  .meta({ id: 'PublicRecordSummary' });

export type PublicRecordSummary = z.infer<typeof publicRecordSummarySchema>;

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export const systemHealthSchema = z
  .object({
    tableCounts: z.record(z.string(), z.number()),
    lastIngestAt: z.string().nullable(),
    dbEngine: z.string(),
    schemaVersion: z.string().nullable(),
  })
  .meta({ id: 'SystemHealth' });

export type SystemHealth = z.infer<typeof systemHealthSchema>;

export const appSettingEntrySchema = z
  .object({
    key: z.string(),
    value: z.string(),
    updatedAt: z.string(),
  })
  .meta({ id: 'AppSettingEntry' });

export type AppSettingEntry = z.infer<typeof appSettingEntrySchema>;

// ---------------------------------------------------------------------------
// Insights
// ---------------------------------------------------------------------------

export const insightListSchema = paginationSchema
  .extend({
    subjectId: z.string().optional(),
    severity: z.string().optional(),
    kind: z.string().optional(),
  })
  .meta({ id: 'InsightListParams' });

export type InsightListParams = z.infer<typeof insightListSchema>;

export const insightSummarySchema = z
  .object({
    insightId: z.string(),
    kind: z.string(),
    severity: z.string().nullable(),
    summary: z.string().nullable(),
    generatedAt: z.string(),
    linkedEntityIds: z.array(z.string()),
  })
  .meta({ id: 'InsightSummary' });

export type InsightSummary = z.infer<typeof insightSummarySchema>;

export const subjectAnomalyDataSchema = z
  .object({
    countBySeverity: z.record(z.string(), z.number()),
    recentInsights: z.array(insightSummarySchema),
  })
  .meta({ id: 'SubjectAnomalyData' });

export type SubjectAnomalyData = z.infer<typeof subjectAnomalyDataSchema>;
