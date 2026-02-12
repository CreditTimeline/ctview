import { describe, it, expect } from 'vitest';
import { generateOpenApiSpec } from '../openapi/index.js';

describe('OpenAPI spec generation', () => {
  const spec = generateOpenApiSpec() as Record<string, unknown>;

  it('has required OpenAPI 3.1 fields', () => {
    expect(spec.openapi).toBe('3.1.0');
    expect(spec.info).toBeDefined();
    const info = spec.info as Record<string, unknown>;
    expect(info.title).toBe('ctview API');
    expect(info.version).toBe('1.0.0');
  });

  it('has paths object', () => {
    expect(spec.paths).toBeDefined();
    expect(typeof spec.paths).toBe('object');
  });

  const expectedPaths = [
    '/health',
    '/ready',
    '/ingest',
    '/dashboard',
    '/subjects',
    '/subjects/{subjectId}/summary',
    '/subjects/{subjectId}/anomalies',
    '/tradelines',
    '/tradelines/{tradelineId}',
    '/tradelines/{tradelineId}/metrics',
    '/searches',
    '/scores',
    '/imports',
    '/imports/{importId}',
    '/addresses',
    '/insights',
    '/public-records',
    '/settings',
    '/settings/health',
  ];

  it('contains all 19 API paths', () => {
    const paths = spec.paths as Record<string, unknown>;
    const pathKeys = Object.keys(paths);
    expect(pathKeys).toHaveLength(19);
    for (const p of expectedPaths) {
      expect(paths).toHaveProperty(p);
    }
  });

  it('has unique operationIds across all endpoints', () => {
    const paths = spec.paths as Record<string, Record<string, Record<string, unknown>>>;
    const operationIds: string[] = [];

    for (const pathObj of Object.values(paths)) {
      for (const method of Object.values(pathObj)) {
        if (method.operationId) {
          operationIds.push(method.operationId as string);
        }
      }
    }

    expect(operationIds.length).toBeGreaterThanOrEqual(19);
    const unique = new Set(operationIds);
    expect(unique.size).toBe(operationIds.length);
  });

  it('has tags defined', () => {
    const tags = spec.tags as Array<{ name: string }>;
    expect(tags.length).toBeGreaterThanOrEqual(10);
    const tagNames = tags.map((t) => t.name);
    expect(tagNames).toContain('Health');
    expect(tagNames).toContain('Ingestion');
    expect(tagNames).toContain('Dashboard');
    expect(tagNames).toContain('Tradelines');
    expect(tagNames).toContain('Settings');
  });

  it('has BearerAuth security scheme', () => {
    const components = spec.components as Record<string, Record<string, unknown>>;
    expect(components.securitySchemes).toBeDefined();
    const schemes = components.securitySchemes as Record<string, Record<string, unknown>>;
    expect(schemes.BearerAuth).toBeDefined();
    expect(schemes.BearerAuth.type).toBe('http');
    expect(schemes.BearerAuth.scheme).toBe('bearer');
  });

  it('ingest endpoint uses POST method and has security', () => {
    const paths = spec.paths as Record<string, Record<string, Record<string, unknown>>>;
    const ingest = paths['/ingest'];
    expect(ingest.post).toBeDefined();
    expect(ingest.post.operationId).toBe('ingestCreditFile');
    expect(ingest.post.security).toBeDefined();
  });

  it('response schemas are wrapped in data envelope', () => {
    const paths = spec.paths as Record<string, Record<string, Record<string, unknown>>>;
    const dashboard = paths['/dashboard'];
    const responses = dashboard.get.responses as Record<string, Record<string, unknown>>;
    const ok = responses['200'] as Record<string, unknown>;
    const content = ok.content as Record<string, Record<string, unknown>>;
    const jsonSchema = content['application/json'].schema as Record<string, unknown>;
    const properties = jsonSchema.properties as Record<string, unknown>;
    expect(properties).toHaveProperty('data');
  });

  it('has component schemas auto-registered from Zod .meta({ id })', () => {
    const components = spec.components as Record<string, unknown>;
    const schemas = components.schemas as Record<string, unknown>;
    expect(schemas).toBeDefined();
    // Schemas with .meta({ id }) should be registered as components
    expect(Object.keys(schemas).length).toBeGreaterThan(0);
  });
});
