import { describe, it, expect, vi } from 'vitest';
import { CtviewClient } from '../client.js';
import { CtviewApiError } from '../errors.js';

function createMockFetch(data: unknown = {}, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(status >= 200 && status < 300 ? { data } : { error: data }),
  });
}

describe('CtviewClient', () => {
  describe('constructor', () => {
    it('appends /api/v1 if not present', () => {
      const fetch = createMockFetch({ status: 'ready' });
      const client = new CtviewClient({ baseUrl: 'http://localhost:3000', fetch });
      client.checkReady();
      const calledUrl = fetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/api/v1/');
    });

    it('does not double-append /api/v1', () => {
      const fetch = createMockFetch({ status: 'ready' });
      const client = new CtviewClient({
        baseUrl: 'http://localhost:3000/api/v1',
        fetch,
      });
      client.checkReady();
      const calledUrl = fetch.mock.calls[0][0] as string;
      expect(calledUrl).not.toContain('/api/v1/api/v1');
    });

    it('strips trailing slash before appending', () => {
      const fetch = createMockFetch({ status: 'ready' });
      const client = new CtviewClient({
        baseUrl: 'http://localhost:3000/',
        fetch,
      });
      client.checkReady();
      const calledUrl = fetch.mock.calls[0][0] as string;
      expect(calledUrl).toMatch(/localhost:3000\/api\/v1\/ready$/);
    });
  });

  describe('health endpoints', () => {
    it('getHealth calls settings/health', async () => {
      const fetch = createMockFetch({
        tableCounts: {},
        lastIngestAt: null,
        dbEngine: 'sqlite',
        schemaVersion: null,
      });
      const client = new CtviewClient({ baseUrl: 'http://localhost:3000', fetch });
      const result = await client.getHealth();
      expect(fetch.mock.calls[0][0]).toContain('/settings/health');
      expect(result.dbEngine).toBe('sqlite');
    });

    it('checkReady calls ready', async () => {
      const fetch = createMockFetch({ status: 'ready' });
      const client = new CtviewClient({ baseUrl: 'http://localhost:3000', fetch });
      const result = await client.checkReady();
      expect(fetch.mock.calls[0][0]).toContain('/ready');
      expect(result.status).toBe('ready');
    });
  });

  describe('ingest', () => {
    it('sends POST with JSON body', async () => {
      const fetch = createMockFetch({ success: true, importIds: ['imp-1'] }, 201);
      // Need to adjust mock for 201
      fetch.mockResolvedValue({
        ok: true,
        status: 201,
        statusText: 'Created',
        json: () => Promise.resolve({ data: { success: true, importIds: ['imp-1'] } }),
      });
      const client = new CtviewClient({ baseUrl: 'http://localhost:3000', fetch });
      const result = await client.ingest({ version: '1.0' });
      const [url, init] = fetch.mock.calls[0];
      expect(url).toContain('/ingest');
      expect(init.method).toBe('POST');
      expect(init.headers['Content-Type']).toBe('application/json');
      expect(JSON.parse(init.body)).toEqual({ version: '1.0' });
      expect(result.success).toBe(true);
    });
  });

  describe('dashboard', () => {
    it('getDashboard calls dashboard', async () => {
      const dashData = { counts: {}, latestScores: [], debtSummary: {}, recentImports: [] };
      const fetch = createMockFetch(dashData);
      const client = new CtviewClient({ baseUrl: 'http://localhost:3000', fetch });
      await client.getDashboard();
      expect(fetch.mock.calls[0][0]).toContain('/dashboard');
    });
  });

  describe('subjects', () => {
    it('listSubjects calls subjects with params', async () => {
      const fetch = createMockFetch({ items: [], total: 0, limit: 10, offset: 0 });
      const client = new CtviewClient({ baseUrl: 'http://localhost:3000', fetch });
      await client.listSubjects({ limit: 10, offset: 0 });
      const calledUrl = fetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/subjects');
      expect(calledUrl).toContain('limit=10');
    });

    it('getSubjectSummary calls subjects/:id/summary', async () => {
      const fetch = createMockFetch({ subjectId: 'sub-1' });
      const client = new CtviewClient({ baseUrl: 'http://localhost:3000', fetch });
      await client.getSubjectSummary('sub-1');
      expect(fetch.mock.calls[0][0]).toContain('/subjects/sub-1/summary');
    });

    it('getSubjectAnomalies calls subjects/:id/anomalies', async () => {
      const fetch = createMockFetch({ countBySeverity: {}, recentInsights: [] });
      const client = new CtviewClient({ baseUrl: 'http://localhost:3000', fetch });
      await client.getSubjectAnomalies('sub-1');
      expect(fetch.mock.calls[0][0]).toContain('/subjects/sub-1/anomalies');
    });
  });

  describe('tradelines', () => {
    it('listTradelines calls tradelines with filter params', async () => {
      const fetch = createMockFetch({ items: [], total: 0, limit: 50, offset: 0 });
      const client = new CtviewClient({ baseUrl: 'http://localhost:3000', fetch });
      await client.listTradelines({ subjectId: 'sub-1', accountType: 'mortgage' });
      const calledUrl = fetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/tradelines');
      expect(calledUrl).toContain('subjectId=sub-1');
      expect(calledUrl).toContain('accountType=mortgage');
    });

    it('getTradelineDetail calls tradelines/:id', async () => {
      const fetch = createMockFetch({ tradelineId: 'tl-1' });
      const client = new CtviewClient({ baseUrl: 'http://localhost:3000', fetch });
      await client.getTradelineDetail('tl-1');
      expect(fetch.mock.calls[0][0]).toContain('/tradelines/tl-1');
    });

    it('getTradelineMetrics calls tradelines/:id/metrics', async () => {
      const fetch = createMockFetch({ tradelineId: 'tl-1', metrics: [] });
      const client = new CtviewClient({ baseUrl: 'http://localhost:3000', fetch });
      await client.getTradelineMetrics('tl-1', { metricType: 'balance' });
      const calledUrl = fetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/tradelines/tl-1/metrics');
      expect(calledUrl).toContain('metricType=balance');
    });
  });

  describe('searches', () => {
    it('listSearches calls searches with filter params', async () => {
      const fetch = createMockFetch({ items: [], total: 0, limit: 50, offset: 0 });
      const client = new CtviewClient({ baseUrl: 'http://localhost:3000', fetch });
      await client.listSearches({ visibility: 'hard', from: '2024-01-01' });
      const calledUrl = fetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/searches');
      expect(calledUrl).toContain('visibility=hard');
      expect(calledUrl).toContain('from=2024-01-01');
    });
  });

  describe('scores', () => {
    it('listScores calls scores', async () => {
      const fetch = createMockFetch({ items: [], total: 0, limit: 50, offset: 0 });
      const client = new CtviewClient({ baseUrl: 'http://localhost:3000', fetch });
      await client.listScores({ sourceSystem: 'equifax' });
      const calledUrl = fetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/scores');
      expect(calledUrl).toContain('sourceSystem=equifax');
    });
  });

  describe('imports', () => {
    it('listImports calls imports', async () => {
      const fetch = createMockFetch({ items: [], total: 0, limit: 50, offset: 0 });
      const client = new CtviewClient({ baseUrl: 'http://localhost:3000', fetch });
      await client.listImports({ subjectId: 'sub-1' });
      const calledUrl = fetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/imports');
      expect(calledUrl).toContain('subjectId=sub-1');
    });

    it('getImportDetail calls imports/:id', async () => {
      const fetch = createMockFetch({ importId: 'imp-1' });
      const client = new CtviewClient({ baseUrl: 'http://localhost:3000', fetch });
      await client.getImportDetail('imp-1');
      expect(fetch.mock.calls[0][0]).toContain('/imports/imp-1');
    });
  });

  describe('addresses', () => {
    it('listAddresses calls addresses', async () => {
      const fetch = createMockFetch({ items: [], total: 0, limit: 50, offset: 0 });
      const client = new CtviewClient({ baseUrl: 'http://localhost:3000', fetch });
      await client.listAddresses({ role: 'current' });
      const calledUrl = fetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/addresses');
      expect(calledUrl).toContain('role=current');
    });
  });

  describe('insights', () => {
    it('listInsights calls insights', async () => {
      const fetch = createMockFetch({ items: [], total: 0, limit: 50, offset: 0 });
      const client = new CtviewClient({ baseUrl: 'http://localhost:3000', fetch });
      await client.listInsights({ severity: 'high', kind: 'anomaly' });
      const calledUrl = fetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/insights');
      expect(calledUrl).toContain('severity=high');
      expect(calledUrl).toContain('kind=anomaly');
    });
  });

  describe('public records', () => {
    it('listPublicRecords calls public-records', async () => {
      const fetch = createMockFetch({ items: [], total: 0, limit: 50, offset: 0 });
      const client = new CtviewClient({ baseUrl: 'http://localhost:3000', fetch });
      await client.listPublicRecords();
      expect(fetch.mock.calls[0][0]).toContain('/public-records');
    });
  });

  describe('settings', () => {
    it('getSettings calls settings', async () => {
      const fetch = createMockFetch([]);
      const client = new CtviewClient({ baseUrl: 'http://localhost:3000', fetch });
      await client.getSettings();
      expect(fetch.mock.calls[0][0]).toContain('/settings');
      // Should not match /settings/health
      expect(fetch.mock.calls[0][0]).not.toContain('/settings/health');
    });

    it('updateSetting sends PUT with key and value', async () => {
      const fetch = createMockFetch({ key: 'theme', value: 'dark', updatedAt: '2024-01-01' });
      const client = new CtviewClient({ baseUrl: 'http://localhost:3000', fetch });
      await client.updateSetting('theme', 'dark');
      const [url, init] = fetch.mock.calls[0];
      expect(url).toContain('/settings');
      expect(init.method).toBe('PUT');
      expect(JSON.parse(init.body)).toEqual({ key: 'theme', value: 'dark' });
    });
  });

  describe('error handling', () => {
    it('throws CtviewApiError on 404', async () => {
      const fetch = createMockFetch({ code: 'NOT_FOUND', message: 'Not found' }, 404);
      const client = new CtviewClient({ baseUrl: 'http://localhost:3000', fetch });
      await expect(client.getSubjectSummary('missing')).rejects.toThrow(CtviewApiError);
    });

    it('throws CtviewApiError on 400', async () => {
      const fetch = createMockFetch({ code: 'VALIDATION_FAILED', message: 'Invalid input' }, 400);
      const client = new CtviewClient({ baseUrl: 'http://localhost:3000', fetch });
      await expect(client.listTradelines({ limit: -1 })).rejects.toThrow(CtviewApiError);
    });
  });
});
