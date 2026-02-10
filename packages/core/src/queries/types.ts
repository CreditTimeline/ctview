import { z } from 'zod';

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type PaginationParams = z.infer<typeof paginationSchema>;

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export interface EntityCounts {
  tradelines: number;
  imports: number;
  searches: number;
  scores: number;
  publicRecords: number;
  addresses: number;
  fraudMarkers: number;
  disputes: number;
  insights: number;
}

export interface LatestScore {
  scoreId: string;
  sourceSystem: string;
  scoreValue: number | null;
  scoreMin: number | null;
  scoreMax: number | null;
  scoreBand: string | null;
  calculatedAt: string | null;
}

export interface DebtSummary {
  totalBalance: number;
  totalCreditLimit: number;
  openTradelineCount: number;
}

export interface RecentImport {
  importId: string;
  importedAt: string;
  sourceSystem: string;
  acquisitionMethod: string;
  entityCounts: Record<string, number> | null;
}

export interface DashboardData {
  counts: EntityCounts;
  latestScores: LatestScore[];
  debtSummary: DebtSummary;
  recentImports: RecentImport[];
}

// ---------------------------------------------------------------------------
// Subjects
// ---------------------------------------------------------------------------

export interface SubjectListItem {
  subjectId: string;
  createdAt: string;
  primaryName: string | null;
  tradelineCount: number;
  latestImportAt: string | null;
}

export interface SubjectSummary {
  subjectId: string;
  createdAt: string;
  names: { nameId: string; fullName: string | null; nameType: string | null }[];
  activeTradelineCount: number;
  closedTradelineCount: number;
  publicRecordCount: number;
  fraudMarkerCount: number;
  latestScores: LatestScore[];
  lastImportAt: string | null;
  insightCount: number;
}

// ---------------------------------------------------------------------------
// Tradelines
// ---------------------------------------------------------------------------

export const tradelineListSchema = paginationSchema.extend({
  subjectId: z.string().optional(),
  accountType: z.string().optional(),
  status: z.string().optional(),
  sourceSystem: z.string().optional(),
});

export type TradelineListParams = z.infer<typeof tradelineListSchema>;

export interface TradelineSummary {
  tradelineId: string;
  canonicalId: string | null;
  furnisherName: string | null;
  accountType: string | null;
  openedAt: string | null;
  closedAt: string | null;
  statusCurrent: string | null;
  sourceSystem: string;
  latestBalance: number | null;
  latestCreditLimit: number | null;
  latestSnapshotDate: string | null;
}

export interface TradelineDetail {
  tradelineId: string;
  canonicalId: string | null;
  subjectId: string;
  furnisherName: string | null;
  furnisherNameRaw: string | null;
  accountType: string | null;
  openedAt: string | null;
  closedAt: string | null;
  statusCurrent: string | null;
  repaymentFrequency: string | null;
  regularPaymentAmount: number | null;
  sourceSystem: string;
  identifiers: {
    identifierId: string;
    identifierType: string;
    value: string;
  }[];
  parties: {
    partyId: string;
    partyRole: string | null;
    name: string | null;
  }[];
  terms: {
    termsId: string;
    termType: string | null;
    termCount: number | null;
    termPaymentAmount: number | null;
    paymentStartDate: string | null;
  }[];
  snapshots: {
    snapshotId: string;
    asOfDate: string | null;
    statusCurrent: string | null;
    currentBalance: number | null;
    openingBalance: number | null;
    creditLimit: number | null;
    delinquentBalance: number | null;
    paymentAmount: number | null;
  }[];
  events: {
    eventId: string;
    eventType: string;
    eventDate: string;
    amount: number | null;
    notes: string | null;
  }[];
  crossAgencyPeers: {
    tradelineId: string;
    sourceSystem: string;
    furnisherName: string | null;
  }[];
}

export const tradelineMetricsSchema = paginationSchema.extend({
  metricType: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export type TradelineMetricsParams = z.infer<typeof tradelineMetricsSchema>;

export interface MetricDataPoint {
  monthlyMetricId: string;
  period: string;
  metricType: string;
  valueNumeric: number | null;
  valueText: string | null;
  canonicalStatus: string | null;
}

export interface TradelineMetricSeries {
  tradelineId: string;
  metrics: MetricDataPoint[];
}

// ---------------------------------------------------------------------------
// Searches
// ---------------------------------------------------------------------------

export const searchListSchema = paginationSchema.extend({
  subjectId: z.string().optional(),
  visibility: z.string().optional(),
  searchType: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export type SearchListParams = z.infer<typeof searchListSchema>;

export interface SearchSummary {
  searchId: string;
  searchedAt: string | null;
  organisationName: string | null;
  searchType: string | null;
  visibility: string | null;
  purposeText: string | null;
}

export interface SearchTimelineBucket {
  month: string;
  count: number;
}

export interface SearchTimelineData {
  hardSearches: SearchTimelineBucket[];
  softSearches: SearchTimelineBucket[];
}

export interface SearchFrequencyItem {
  organisationName: string | null;
  searchType: string | null;
  count: number;
}

export interface SearchFrequencyData {
  items: SearchFrequencyItem[];
}

// ---------------------------------------------------------------------------
// Scores
// ---------------------------------------------------------------------------

export const scoreListSchema = paginationSchema.extend({
  subjectId: z.string().optional(),
  sourceSystem: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export type ScoreListParams = z.infer<typeof scoreListSchema>;

export interface ScoreEntry {
  scoreId: string;
  scoreType: string | null;
  scoreName: string | null;
  scoreValue: number | null;
  scoreMin: number | null;
  scoreMax: number | null;
  scoreBand: string | null;
  calculatedAt: string | null;
  sourceSystem: string;
  scoreFactors: string[];
}

export interface ScoreTrendPoint {
  scoreId: string;
  scoreValue: number | null;
  calculatedAt: string | null;
  sourceSystem: string;
}

export interface ScoreTrendData {
  series: Record<string, ScoreTrendPoint[]>;
}

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

export const importListSchema = paginationSchema.extend({
  subjectId: z.string().optional(),
});

export type ImportListParams = z.infer<typeof importListSchema>;

export interface ImportListItem {
  importId: string;
  fileId: string;
  subjectId: string;
  importedAt: string;
  sourceSystem: string;
  acquisitionMethod: string;
  status: string | null;
  durationMs: number | null;
  entityCounts: Record<string, number> | null;
}

export interface ImportDetail {
  importId: string;
  fileId: string;
  subjectId: string;
  importedAt: string;
  sourceSystem: string;
  acquisitionMethod: string;
  sourceWrapper: string | null;
  mappingVersion: string | null;
  confidenceNotes: string | null;
  rawArtifacts: {
    artifactId: string;
    artifactType: string;
    sha256: string;
    uri: string | null;
  }[];
  receipt: {
    receiptId: string;
    status: string;
    durationMs: number | null;
    entityCounts: Record<string, number> | null;
    ingestedAt: string;
  } | null;
}

export interface ImportDiffDelta {
  entityType: string;
  countA: number;
  countB: number;
  delta: number;
}

export interface ImportDiff {
  importIdA: string;
  importIdB: string;
  deltas: ImportDiffDelta[];
}

// ---------------------------------------------------------------------------
// Addresses
// ---------------------------------------------------------------------------

export const addressListSchema = paginationSchema.extend({
  subjectId: z.string().optional(),
  role: z.string().optional(),
});

export type AddressListParams = z.infer<typeof addressListSchema>;

export interface AddressWithAssociations {
  addressId: string;
  line1: string | null;
  line2: string | null;
  line3: string | null;
  townCity: string | null;
  countyRegion: string | null;
  postcode: string | null;
  countryCode: string | null;
  normalizedSingleLine: string | null;
  associations: {
    associationId: string;
    role: string | null;
    validFrom: string | null;
    validTo: string | null;
  }[];
  electoralRollEntries: {
    electoralEntryId: string;
    nameOnRegister: string | null;
    registeredFrom: string | null;
    registeredTo: string | null;
  }[];
}

// ---------------------------------------------------------------------------
// Insights
// ---------------------------------------------------------------------------

export const insightListSchema = paginationSchema.extend({
  subjectId: z.string().optional(),
  severity: z.string().optional(),
  kind: z.string().optional(),
});

export type InsightListParams = z.infer<typeof insightListSchema>;

export interface InsightSummary {
  insightId: string;
  kind: string;
  severity: string | null;
  summary: string | null;
  generatedAt: string;
  linkedEntityIds: string[];
}

export interface SubjectAnomalyData {
  countBySeverity: Record<string, number>;
  recentInsights: InsightSummary[];
}
