import { describe, it, expect } from 'vitest';
import { createTestDb } from '../helpers/test-db.js';
import { createSeededDb, createTradelineSeededDb } from './query-test-helpers.js';
import { listAddresses } from '../../queries/addresses.js';

describe('listAddresses', () => {
  it('returns empty result on empty database', () => {
    const db = createTestDb();
    const result = listAddresses(db, { limit: 50, offset: 0 });

    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('returns addresses after ingestion', async () => {
    const db = await createSeededDb();
    const result = listAddresses(db, { limit: 50, offset: 0 });

    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(2);
  });

  it('includes address fields', async () => {
    const db = await createSeededDb();
    const result = listAddresses(db, { limit: 50, offset: 0 });

    const addr = result.items.find((a) => a.addressId === 'addr_current_01');
    expect(addr).toBeDefined();
    expect(addr!.line1).toBe('32 Mitchell Drive');
    expect(addr!.postcode).toBe('SO50 7FU');
    expect(addr!.countryCode).toBe('GB');
  });

  it('includes associations', async () => {
    const db = await createSeededDb();
    const result = listAddresses(db, { limit: 50, offset: 0 });

    const addr = result.items.find((a) => a.addressId === 'addr_current_01');
    expect(addr!.associations.length).toBeGreaterThan(0);
    expect(addr!.associations[0].role).toBe('current');
  });

  it('includes electoral roll entries', async () => {
    const db = await createSeededDb();
    const result = listAddresses(db, { limit: 50, offset: 0 });

    const addr = result.items.find((a) => a.addressId === 'addr_current_01');
    expect(addr!.electoralRollEntries.length).toBeGreaterThan(0);
    expect(addr!.electoralRollEntries[0].nameOnRegister).toBeTruthy();
  });

  it('filters by subjectId', async () => {
    const db = await createSeededDb();

    const found = listAddresses(db, { limit: 50, offset: 0, subjectId: 'subj_01' });
    expect(found.items).toHaveLength(2);

    const notFound = listAddresses(db, { limit: 50, offset: 0, subjectId: 'nonexistent' });
    expect(notFound.items).toHaveLength(0);
  });

  it('filters by role', async () => {
    const db = await createSeededDb();

    const current = listAddresses(db, { limit: 50, offset: 0, role: 'current' });
    expect(current.items).toHaveLength(1);
    expect(current.items[0].postcode).toBe('SO50 7FU');

    const previous = listAddresses(db, { limit: 50, offset: 0, role: 'previous' });
    expect(previous.items).toHaveLength(1);
    expect(previous.items[0].postcode).toBe('RG24 9SS');
  });

  it('respects pagination', async () => {
    const db = await createSeededDb();

    const page = listAddresses(db, { limit: 1, offset: 0 });
    expect(page.items).toHaveLength(1);
    expect(page.total).toBe(2);
  });

  it('returns addresses with associations from tradeline fixture', async () => {
    const db = await createTradelineSeededDb();
    const result = listAddresses(db, { limit: 50, offset: 0 });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].addressId).toBe('addr_test_001');
    expect(result.items[0].postcode).toBe('TE1 1ST');
  });
});
