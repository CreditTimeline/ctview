import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const EXAMPLE_FILE = resolve(
  process.cwd(),
  '../../spec/examples/credittimeline-file.v1.example.json',
);

test.describe('Ingestion API', () => {
  test('ingests a valid credit file', async ({ request }) => {
    const data = JSON.parse(readFileSync(EXAMPLE_FILE, 'utf-8'));
    const response = await request.post('/api/v1/ingest', { data });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.data.success).toBe(true);
    expect(body.data.importIds).toBeDefined();
    expect(body.data.importIds.length).toBeGreaterThan(0);
  });

  test('rejects invalid JSON with 400', async ({ request }) => {
    const response = await request.post('/api/v1/ingest', {
      data: { invalid: true },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe('VALIDATION_FAILED');
  });

  test('handles duplicate ingestion', async ({ request }) => {
    const data = JSON.parse(readFileSync(EXAMPLE_FILE, 'utf-8'));
    // First ingest (may already exist from global setup)
    await request.post('/api/v1/ingest', { data });
    // Second ingest (duplicate)
    const response = await request.post('/api/v1/ingest', { data });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.data.duplicate).toBe(true);
  });
});
