import { describe, it, expect } from 'vitest';
import { createTestDb } from '../helpers/test-db.js';
import { ingestCreditFile } from '../../ingestion/ingest-file.js';
import {
  createSeededDb,
  createTradelineSeededDb,
  buildCreditFileWithAddressLinks,
} from './query-test-helpers.js';
import { listAddresses, getAddressLinks } from '../../queries/addresses.js';

async function createAddressLinkSeededDb() {
  const db = createTestDb();
  const data = buildCreditFileWithAddressLinks();
  const result = await ingestCreditFile(db, data);
  if (!result.success) throw new Error(`Seed failed: ${result.errors?.join(', ')}`);
  return db;
}

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

describe('getAddressLinks', () => {
  it('returns empty array on empty database', () => {
    const db = createTestDb();
    const result = getAddressLinks(db, 'subj_test_001');

    expect(result).toHaveLength(0);
  });

  it('returns address links after ingestion', async () => {
    const db = await createAddressLinkSeededDb();
    const result = getAddressLinks(db, 'subj_test_001');

    expect(result).toHaveLength(2);
  });

  it('returns links ordered by last_confirmed_at DESC', async () => {
    const db = await createAddressLinkSeededDb();
    const result = getAddressLinks(db, 'subj_test_001');

    expect(result[0].linkedAt).toBe('2025-06-10');
    expect(result[1].linkedAt).toBe('2024-01-15');
  });

  it('resolves from/to address display names', async () => {
    const db = await createAddressLinkSeededDb();
    const result = getAddressLinks(db, 'subj_test_001');

    const mostRecent = result[0];
    expect(mostRecent.fromAddress).toBe('10 NEW ROAD, MANCHESTER, M1 1AA');
    expect(mostRecent.toAddress).toBe('20 LATEST AVENUE, BRISTOL, BS1 1AB');

    const older = result[1];
    expect(older.fromAddress).toBe('5 OLD STREET, LONDON, EC1V 9HL');
    expect(older.toAddress).toBe('10 NEW ROAD, MANCHESTER, M1 1AA');
  });

  it('includes link metadata', async () => {
    const db = await createAddressLinkSeededDb();
    const result = getAddressLinks(db, 'subj_test_001');

    expect(result[0].linkId).toBe('al_test_002');
    expect(result[0].sourceSystem).toBe('equifax');
  });

  it('returns empty for non-existent subject', async () => {
    const db = await createAddressLinkSeededDb();
    const result = getAddressLinks(db, 'nonexistent');

    expect(result).toHaveLength(0);
  });
});
