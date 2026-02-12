import { request } from '@playwright/test';
import { readFileSync } from 'fs';
import { resolve } from 'path';

async function globalSetup() {
  const ctx = await request.newContext({ baseURL: 'http://localhost:4173' });
  const exampleFile = resolve(
    process.cwd(),
    '../../spec/examples/credittimeline-file.v1.example.json',
  );
  const data = JSON.parse(readFileSync(exampleFile, 'utf-8'));

  const response = await ctx.post('/api/v1/ingest', { data });
  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`Failed to ingest test data: ${response.status()} - ${body}`);
  }
  await ctx.dispose();
}

export default globalSetup;
