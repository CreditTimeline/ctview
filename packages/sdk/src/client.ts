import type {
  DashboardData,
  SubjectListItem,
  SubjectSummary,
  SubjectAnomalyData,
  TradelineSummary,
  TradelineDetail,
  TradelineMetricSeries,
  SearchSummary,
  ScoreEntry,
  ImportListItem,
  ImportDetail,
  AddressWithAssociations,
  PublicRecordSummary,
  SystemHealth,
  AppSettingEntry,
  InsightSummary,
  PaginatedResult,
  IngestResult,
} from '@ctview/core';
import { apiFetch, type FetchOptions } from './fetch-wrapper.js';

export interface CtviewClientOptions {
  baseUrl: string;
  apiKey?: string;
  fetch?: typeof globalThis.fetch;
  headers?: Record<string, string>;
}

interface PaginationParams {
  limit?: number;
  offset?: number;
}

export class CtviewClient {
  private readonly options: FetchOptions;

  constructor(options: CtviewClientOptions) {
    let baseUrl = options.baseUrl.replace(/\/$/, '');
    if (!baseUrl.endsWith('/api/v1')) {
      baseUrl += '/api/v1';
    }
    this.options = { ...options, baseUrl: baseUrl + '/' };
  }

  // Health
  async getHealth(): Promise<SystemHealth> {
    return apiFetch(this.options, 'settings/health');
  }

  async checkReady(): Promise<{ status: string }> {
    return apiFetch(this.options, 'ready');
  }

  // Ingest
  async ingest(body: unknown): Promise<IngestResult> {
    return apiFetch(this.options, 'ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  // Dashboard
  async getDashboard(): Promise<DashboardData> {
    return apiFetch(this.options, 'dashboard');
  }

  // Subjects
  async listSubjects(
    params?: PaginationParams,
  ): Promise<PaginatedResult<SubjectListItem>> {
    return apiFetch(this.options, 'subjects', { params: params as Record<string, string | number | undefined> });
  }

  async getSubjectSummary(subjectId: string): Promise<SubjectSummary> {
    return apiFetch(this.options, `subjects/${subjectId}/summary`);
  }

  async getSubjectAnomalies(subjectId: string): Promise<SubjectAnomalyData> {
    return apiFetch(this.options, `subjects/${subjectId}/anomalies`);
  }

  // Tradelines
  async listTradelines(
    params?: PaginationParams & {
      subjectId?: string;
      accountType?: string;
      status?: string;
      sourceSystem?: string;
    },
  ): Promise<PaginatedResult<TradelineSummary>> {
    return apiFetch(this.options, 'tradelines', { params: params as Record<string, string | number | undefined> });
  }

  async getTradelineDetail(tradelineId: string): Promise<TradelineDetail> {
    return apiFetch(this.options, `tradelines/${tradelineId}`);
  }

  async getTradelineMetrics(
    tradelineId: string,
    params?: PaginationParams & { metricType?: string; from?: string; to?: string },
  ): Promise<TradelineMetricSeries> {
    return apiFetch(this.options, `tradelines/${tradelineId}/metrics`, {
      params: params as Record<string, string | number | undefined>,
    });
  }

  // Searches
  async listSearches(
    params?: PaginationParams & {
      subjectId?: string;
      visibility?: string;
      searchType?: string;
      from?: string;
      to?: string;
    },
  ): Promise<PaginatedResult<SearchSummary>> {
    return apiFetch(this.options, 'searches', { params: params as Record<string, string | number | undefined> });
  }

  // Scores
  async listScores(
    params?: PaginationParams & {
      subjectId?: string;
      sourceSystem?: string;
      from?: string;
      to?: string;
    },
  ): Promise<PaginatedResult<ScoreEntry>> {
    return apiFetch(this.options, 'scores', { params: params as Record<string, string | number | undefined> });
  }

  // Imports
  async listImports(
    params?: PaginationParams & { subjectId?: string },
  ): Promise<PaginatedResult<ImportListItem>> {
    return apiFetch(this.options, 'imports', { params: params as Record<string, string | number | undefined> });
  }

  async getImportDetail(importId: string): Promise<ImportDetail> {
    return apiFetch(this.options, `imports/${importId}`);
  }

  // Addresses
  async listAddresses(
    params?: PaginationParams & { subjectId?: string; role?: string },
  ): Promise<PaginatedResult<AddressWithAssociations>> {
    return apiFetch(this.options, 'addresses', { params: params as Record<string, string | number | undefined> });
  }

  // Insights
  async listInsights(
    params?: PaginationParams & { subjectId?: string; severity?: string; kind?: string },
  ): Promise<PaginatedResult<InsightSummary>> {
    return apiFetch(this.options, 'insights', { params: params as Record<string, string | number | undefined> });
  }

  // Public Records
  async listPublicRecords(
    params?: PaginationParams & { subjectId?: string },
  ): Promise<PaginatedResult<PublicRecordSummary>> {
    return apiFetch(this.options, 'public-records', { params: params as Record<string, string | number | undefined> });
  }

  // Settings
  async getSettings(): Promise<AppSettingEntry[]> {
    return apiFetch(this.options, 'settings');
  }

  async updateSetting(key: string, value: string): Promise<AppSettingEntry> {
    return apiFetch(this.options, 'settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    });
  }
}
