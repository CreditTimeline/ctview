import { describe, it, expect } from 'vitest';
import { createTestDb } from '../helpers/test-db.js';
import { createSeededDb } from './query-test-helpers.js';
import { listImports, getImportDetail, diffImports } from '../../queries/imports.js';

describe('listImports', () => {
  it('returns empty result on empty database', () => {
    const db = createTestDb();
    const result = listImports(db, { limit: 50, offset: 0 });

    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('returns imports after ingestion', async () => {
    const db = await createSeededDb();
    const result = listImports(db, { limit: 50, offset: 0 });

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.items[0].importId).toBe('imp_2026_02_07_eqf');
    expect(result.items[0].sourceSystem).toBe('equifax');
    expect(result.items[0].acquisitionMethod).toBe('pdf_upload');
  });

  it('includes receipt data', async () => {
    const db = await createSeededDb();
    const result = listImports(db, { limit: 50, offset: 0 });

    expect(result.items[0].status).toBe('success');
    expect(result.items[0].durationMs).toBeGreaterThanOrEqual(0);
  });

  it('filters by subjectId', async () => {
    const db = await createSeededDb();

    const found = listImports(db, { limit: 50, offset: 0, subjectId: 'subj_01' });
    expect(found.items).toHaveLength(1);

    const notFound = listImports(db, { limit: 50, offset: 0, subjectId: 'nonexistent' });
    expect(notFound.items).toHaveLength(0);
  });

  it('respects pagination', async () => {
    const db = await createSeededDb();

    const page1 = listImports(db, { limit: 1, offset: 0 });
    expect(page1.items).toHaveLength(1);

    const page2 = listImports(db, { limit: 1, offset: 1 });
    expect(page2.items).toHaveLength(0);
    expect(page2.total).toBe(1);
  });
});

describe('getImportDetail', () => {
  it('returns null for non-existent import', () => {
    const db = createTestDb();
    const result = getImportDetail(db, 'nonexistent');
    expect(result).toBeNull();
  });

  it('returns detail for existing import', async () => {
    const db = await createSeededDb();
    const result = getImportDetail(db, 'imp_2026_02_07_eqf');

    expect(result).not.toBeNull();
    expect(result!.importId).toBe('imp_2026_02_07_eqf');
    expect(result!.sourceSystem).toBe('equifax');
    expect(result!.acquisitionMethod).toBe('pdf_upload');
    expect(result!.sourceWrapper).toBe('statutory_direct');
    expect(result!.mappingVersion).toBe('adapter-eqf-0.1.0');
  });

  it('includes raw artifacts', async () => {
    const db = await createSeededDb();
    const result = getImportDetail(db, 'imp_2026_02_07_eqf')!;

    expect(result.rawArtifacts).toHaveLength(1);
    expect(result.rawArtifacts[0].artifactType).toBe('pdf');
    expect(result.rawArtifacts[0].sha256).toBeTruthy();
  });

  it('includes receipt information', async () => {
    const db = await createSeededDb();
    const result = getImportDetail(db, 'imp_2026_02_07_eqf')!;

    expect(result.receipt).not.toBeNull();
    expect(result.receipt!.status).toBe('success');
    expect(result.receipt!.durationMs).toBeGreaterThanOrEqual(0);
  });
});

describe('diffImports', () => {
  it('returns empty deltas when imports have no receipts', () => {
    const db = createTestDb();
    const result = diffImports(db, 'nonexistent_a', 'nonexistent_b');

    expect(result.importIdA).toBe('nonexistent_a');
    expect(result.importIdB).toBe('nonexistent_b');
    expect(result.deltas).toHaveLength(0);
  });
});
