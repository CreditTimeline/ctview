import { describe, it, expect } from 'vitest';
import { createTestDb } from '../helpers/test-db.js';
import { createSeededDb } from './query-test-helpers.js';
import {
  getSystemHealth,
  getAppSettings,
  updateAppSetting,
} from '../../queries/settings.js';

describe('getSystemHealth', () => {
  it('returns zero counts on empty database', () => {
    const db = createTestDb();
    const health = getSystemHealth(db);

    expect(health.tableCounts.reports).toBe(0);
    expect(health.tableCounts.tradelines).toBe(0);
    expect(health.tableCounts.searches).toBe(0);
    expect(health.tableCounts.scores).toBe(0);
    expect(health.tableCounts.imports).toBe(0);
    expect(health.tableCounts.addresses).toBe(0);
    expect(health.tableCounts.publicRecords).toBe(0);
    expect(health.lastIngestAt).toBeNull();
    expect(health.dbDialect).toBe('sqlite');
  });

  it('returns counts after ingestion', async () => {
    const db = await createSeededDb();
    const health = getSystemHealth(db);

    expect(health.tableCounts.tradelines).toBeGreaterThan(0);
    expect(health.tableCounts.imports).toBeGreaterThan(0);
    expect(health.lastIngestAt).toBeTruthy();
  });

  it('returns schema version (ddl_hash)', () => {
    const db = createTestDb();
    const health = getSystemHealth(db);

    // ddl_hash is stored during database creation
    expect(health.schemaVersion).toBeTruthy();
    expect(typeof health.schemaVersion).toBe('string');
  });
});

describe('getAppSettings', () => {
  it('returns at least ddl_hash setting', () => {
    const db = createTestDb();
    const settings = getAppSettings(db);

    const ddlHash = settings.find((s) => s.key === 'ddl_hash');
    expect(ddlHash).toBeDefined();
    expect(ddlHash!.value).toBeTruthy();
  });
});

describe('updateAppSetting', () => {
  it('creates a new setting', () => {
    const db = createTestDb();
    const result = updateAppSetting(db, 'test_key', 'test_value');

    expect(result.key).toBe('test_key');
    expect(result.value).toBe('test_value');
    expect(result.updatedAt).toBeTruthy();

    const settings = getAppSettings(db);
    const found = settings.find((s) => s.key === 'test_key');
    expect(found).toBeDefined();
    expect(found!.value).toBe('test_value');
  });

  it('updates an existing setting', () => {
    const db = createTestDb();
    updateAppSetting(db, 'test_key', 'initial');
    const updated = updateAppSetting(db, 'test_key', 'updated');

    expect(updated.value).toBe('updated');

    const settings = getAppSettings(db);
    const found = settings.find((s) => s.key === 'test_key');
    expect(found!.value).toBe('updated');
  });

  it('sets updatedAt timestamp', () => {
    const db = createTestDb();
    const result = updateAppSetting(db, 'ts_key', 'ts_value');

    expect(result.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
