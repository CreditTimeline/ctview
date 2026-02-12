import 'zod-openapi';
import { z } from 'zod';
import { createDocument } from 'zod-openapi';

// Domain schemas (all have .meta({ id }) for auto-registration)
import {
  paginationSchema,
  dashboardDataSchema,
  subjectListItemSchema,
  subjectSummarySchema,
  subjectAnomalyDataSchema,
  tradelineListSchema,
  tradelineSummarySchema,
  tradelineDetailSchema,
  tradelineMetricsSchema,
  tradelineMetricSeriesSchema,
  searchListSchema,
  searchSummarySchema,
  scoreListSchema,
  scoreEntrySchema,
  importListSchema,
  importListItemSchema,
  importDetailSchema,
  addressListSchema,
  addressWithAssociationsSchema,
  insightListSchema,
  insightSummarySchema,
  publicRecordListSchema,
  publicRecordSummarySchema,
  systemHealthSchema,
  appSettingEntrySchema,
} from '../queries/types.js';

import { ingestResultSchema } from '../ingestion/ingest-file.js';

// ---------------------------------------------------------------------------
// Shared envelope helpers
// ---------------------------------------------------------------------------

function apiSuccessEnvelope<T extends z.ZodType>(schema: T) {
  return z.object({
    data: schema,
    meta: z.record(z.string(), z.unknown()).optional(),
  });
}

const apiErrorBodySchema = z
  .object({
    error: z.object({
      code: z.string(),
      message: z.string(),
      details: z
        .array(
          z.object({
            path: z.string().optional(),
            message: z.string(),
          }),
        )
        .optional(),
    }),
  })
  .meta({ id: 'ApiErrorBody' });

// ---------------------------------------------------------------------------
// Paginated result wrappers (with meta id for component registration)
// ---------------------------------------------------------------------------

function paginatedSchema<T extends z.ZodType>(itemSchema: T, id: string) {
  return z
    .object({
      items: z.array(itemSchema),
      total: z.number(),
      limit: z.number(),
      offset: z.number(),
    })
    .meta({ id });
}

const paginatedSubjects = paginatedSchema(subjectListItemSchema, 'PaginatedSubjects');
const paginatedTradelines = paginatedSchema(tradelineSummarySchema, 'PaginatedTradelines');
const paginatedSearches = paginatedSchema(searchSummarySchema, 'PaginatedSearches');
const paginatedScores = paginatedSchema(scoreEntrySchema, 'PaginatedScores');
const paginatedImports = paginatedSchema(importListItemSchema, 'PaginatedImports');
const paginatedAddresses = paginatedSchema(
  addressWithAssociationsSchema,
  'PaginatedAddresses',
);
const paginatedInsights = paginatedSchema(insightSummarySchema, 'PaginatedInsights');
const paginatedPublicRecords = paginatedSchema(
  publicRecordSummarySchema,
  'PaginatedPublicRecords',
);

// ---------------------------------------------------------------------------
// Simple response schemas for health/ready
// ---------------------------------------------------------------------------

const healthResponseSchema = z
  .object({
    status: z.string(),
    version: z.string(),
  })
  .meta({ id: 'HealthResponse' });

const readyResponseSchema = z
  .object({
    status: z.string(),
  })
  .meta({ id: 'ReadyResponse' });

// ---------------------------------------------------------------------------
// Helpers for common response definitions
// ---------------------------------------------------------------------------

function jsonResponse(schema: z.ZodType, description: string) {
  return {
    description,
    content: {
      'application/json': { schema: apiSuccessEnvelope(schema) },
    },
  };
}

function errorResponse(description: string, statusCode: string) {
  return {
    [statusCode]: {
      description,
      content: {
        'application/json': { schema: apiErrorBodySchema },
      },
    },
  };
}

const validationError = errorResponse('Validation failed', '400');
const notFoundError = errorResponse('Resource not found', '404');
const internalError = errorResponse('Internal server error', '500');

// ---------------------------------------------------------------------------
// OpenAPI document
// ---------------------------------------------------------------------------

export function generateOpenApiSpec(): Record<string, unknown> {
  return createDocument({
    openapi: '3.1.0',
    info: {
      title: 'ctview API',
      version: '1.0.0',
      description:
        'Credit Timeline Viewer API — ingest, query, and analyse credit file data.',
    },
    servers: [{ url: '/api/v1', description: 'Default API base' }],
    tags: [
      { name: 'Health', description: 'Health and readiness probes' },
      { name: 'Ingestion', description: 'Credit file ingestion' },
      { name: 'Dashboard', description: 'Dashboard aggregate data' },
      { name: 'Subjects', description: 'Credit subjects' },
      { name: 'Tradelines', description: 'Tradeline accounts' },
      { name: 'Searches', description: 'Credit search records' },
      { name: 'Scores', description: 'Credit scores' },
      { name: 'Imports', description: 'Import batches' },
      { name: 'Addresses', description: 'Address records' },
      { name: 'Insights', description: 'Generated insights and anomalies' },
      { name: 'Public Records', description: 'Public records (CCJs, IVAs, etc.)' },
      { name: 'Settings', description: 'Application settings and system health' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
        },
      },
    },
    paths: {
      // -----------------------------------------------------------------------
      // Health
      // -----------------------------------------------------------------------
      '/health': {
        get: {
          operationId: 'getHealth',
          tags: ['Health'],
          summary: 'Basic health check',
          responses: {
            '200': jsonResponse(healthResponseSchema, 'Service is healthy'),
          },
        },
      },
      '/ready': {
        get: {
          operationId: 'getReady',
          tags: ['Health'],
          summary: 'Database readiness probe',
          responses: {
            '200': jsonResponse(readyResponseSchema, 'Database is ready'),
            ...errorResponse('Database unreachable', '503'),
          },
        },
      },

      // -----------------------------------------------------------------------
      // Ingestion
      // -----------------------------------------------------------------------
      '/ingest': {
        post: {
          operationId: 'ingestCreditFile',
          tags: ['Ingestion'],
          summary: 'Ingest a CreditFile JSON payload',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  description:
                    'CreditFile JSON payload conforming to the credittimeline-v1 JSON Schema',
                },
              },
            },
          },
          responses: {
            '201': jsonResponse(ingestResultSchema, 'Ingestion succeeded'),
            ...validationError,
            ...internalError,
          },
        },
      },

      // -----------------------------------------------------------------------
      // Dashboard
      // -----------------------------------------------------------------------
      '/dashboard': {
        get: {
          operationId: 'getDashboard',
          tags: ['Dashboard'],
          summary: 'Aggregate dashboard data',
          responses: {
            '200': jsonResponse(dashboardDataSchema, 'Dashboard data'),
          },
        },
      },

      // -----------------------------------------------------------------------
      // Subjects
      // -----------------------------------------------------------------------
      '/subjects': {
        get: {
          operationId: 'listSubjects',
          tags: ['Subjects'],
          summary: 'List credit subjects',
          requestParams: {
            query: paginationSchema,
          },
          responses: {
            '200': jsonResponse(paginatedSubjects, 'Paginated list of subjects'),
            ...validationError,
          },
        },
      },
      '/subjects/{subjectId}/summary': {
        get: {
          operationId: 'getSubjectSummary',
          tags: ['Subjects'],
          summary: 'Get subject summary',
          requestParams: {
            path: z.object({ subjectId: z.string() }),
          },
          responses: {
            '200': jsonResponse(subjectSummarySchema, 'Subject summary'),
            ...notFoundError,
          },
        },
      },
      '/subjects/{subjectId}/anomalies': {
        get: {
          operationId: 'getSubjectAnomalies',
          tags: ['Insights'],
          summary: 'Get anomaly data for a subject',
          requestParams: {
            path: z.object({ subjectId: z.string() }),
          },
          responses: {
            '200': jsonResponse(subjectAnomalyDataSchema, 'Subject anomaly data'),
          },
        },
      },

      // -----------------------------------------------------------------------
      // Tradelines
      // -----------------------------------------------------------------------
      '/tradelines': {
        get: {
          operationId: 'listTradelines',
          tags: ['Tradelines'],
          summary: 'List tradelines with optional filters',
          requestParams: {
            query: tradelineListSchema,
          },
          responses: {
            '200': jsonResponse(paginatedTradelines, 'Paginated list of tradelines'),
            ...validationError,
          },
        },
      },
      '/tradelines/{tradelineId}': {
        get: {
          operationId: 'getTradelineDetail',
          tags: ['Tradelines'],
          summary: 'Get full tradeline detail',
          requestParams: {
            path: z.object({ tradelineId: z.string() }),
          },
          responses: {
            '200': jsonResponse(tradelineDetailSchema, 'Tradeline detail'),
            ...notFoundError,
          },
        },
      },
      '/tradelines/{tradelineId}/metrics': {
        get: {
          operationId: 'getTradelineMetrics',
          tags: ['Tradelines'],
          summary: 'Get tradeline metric time series',
          requestParams: {
            path: z.object({ tradelineId: z.string() }),
            query: tradelineMetricsSchema,
          },
          responses: {
            '200': jsonResponse(
              tradelineMetricSeriesSchema,
              'Tradeline metric series',
            ),
            ...validationError,
          },
        },
      },

      // -----------------------------------------------------------------------
      // Searches
      // -----------------------------------------------------------------------
      '/searches': {
        get: {
          operationId: 'listSearches',
          tags: ['Searches'],
          summary: 'List credit search records',
          requestParams: {
            query: searchListSchema,
          },
          responses: {
            '200': jsonResponse(paginatedSearches, 'Paginated list of searches'),
            ...validationError,
          },
        },
      },

      // -----------------------------------------------------------------------
      // Scores
      // -----------------------------------------------------------------------
      '/scores': {
        get: {
          operationId: 'listScores',
          tags: ['Scores'],
          summary: 'List credit scores',
          requestParams: {
            query: scoreListSchema,
          },
          responses: {
            '200': jsonResponse(paginatedScores, 'Paginated list of scores'),
            ...validationError,
          },
        },
      },

      // -----------------------------------------------------------------------
      // Imports
      // -----------------------------------------------------------------------
      '/imports': {
        get: {
          operationId: 'listImports',
          tags: ['Imports'],
          summary: 'List import batches',
          requestParams: {
            query: importListSchema,
          },
          responses: {
            '200': jsonResponse(paginatedImports, 'Paginated list of imports'),
            ...validationError,
          },
        },
      },
      '/imports/{importId}': {
        get: {
          operationId: 'getImportDetail',
          tags: ['Imports'],
          summary: 'Get import batch detail',
          requestParams: {
            path: z.object({ importId: z.string() }),
          },
          responses: {
            '200': jsonResponse(importDetailSchema, 'Import detail'),
            ...notFoundError,
          },
        },
      },

      // -----------------------------------------------------------------------
      // Addresses
      // -----------------------------------------------------------------------
      '/addresses': {
        get: {
          operationId: 'listAddresses',
          tags: ['Addresses'],
          summary: 'List addresses with associations',
          requestParams: {
            query: addressListSchema,
          },
          responses: {
            '200': jsonResponse(paginatedAddresses, 'Paginated list of addresses'),
            ...validationError,
          },
        },
      },

      // -----------------------------------------------------------------------
      // Insights
      // -----------------------------------------------------------------------
      '/insights': {
        get: {
          operationId: 'listInsights',
          tags: ['Insights'],
          summary: 'List generated insights',
          requestParams: {
            query: insightListSchema,
          },
          responses: {
            '200': jsonResponse(paginatedInsights, 'Paginated list of insights'),
            ...validationError,
          },
        },
      },

      // -----------------------------------------------------------------------
      // Public Records
      // -----------------------------------------------------------------------
      '/public-records': {
        get: {
          operationId: 'listPublicRecords',
          tags: ['Public Records'],
          summary: 'List public records',
          requestParams: {
            query: publicRecordListSchema,
          },
          responses: {
            '200': jsonResponse(
              paginatedPublicRecords,
              'Paginated list of public records',
            ),
            ...validationError,
          },
        },
      },

      // -----------------------------------------------------------------------
      // Settings
      // -----------------------------------------------------------------------
      '/settings': {
        get: {
          operationId: 'listSettings',
          tags: ['Settings'],
          summary: 'Get all application settings',
          responses: {
            '200': jsonResponse(
              z.array(appSettingEntrySchema),
              'List of settings',
            ),
          },
        },
      },
      '/settings/health': {
        get: {
          operationId: 'getSystemHealth',
          tags: ['Settings'],
          summary: 'Get system health with table counts',
          responses: {
            '200': jsonResponse(systemHealthSchema, 'System health data'),
          },
        },
      },
    },
  }) as unknown as Record<string, unknown>;
}
