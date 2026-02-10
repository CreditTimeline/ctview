import { describe, it, expect } from 'vitest';
import { createTestDb } from '../helpers/test-db.js';
import { createSeededDb } from './query-test-helpers.js';
import { listSubjects, getSubjectSummary } from '../../queries/subjects.js';

describe('listSubjects', () => {
  it('returns empty result on empty database', () => {
    const db = createTestDb();
    const result = listSubjects(db, { limit: 50, offset: 0 });

    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
    expect(result.limit).toBe(50);
    expect(result.offset).toBe(0);
  });

  it('returns subjects after ingestion', async () => {
    const db = await createSeededDb();
    const result = listSubjects(db, { limit: 50, offset: 0 });

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.items[0].subjectId).toBe('subj_01');
    expect(result.items[0].primaryName).toBeTruthy(); // legal name exists
    expect(result.items[0].tradelineCount).toBe(1);
    expect(result.items[0].latestImportAt).toBeTruthy();
  });

  it('respects pagination', async () => {
    const db = await createSeededDb();

    const page1 = listSubjects(db, { limit: 1, offset: 0 });
    expect(page1.items).toHaveLength(1);

    const page2 = listSubjects(db, { limit: 1, offset: 1 });
    expect(page2.items).toHaveLength(0);
    expect(page2.total).toBe(1); // total is still 1
  });
});

describe('getSubjectSummary', () => {
  it('returns null for non-existent subject', () => {
    const db = createTestDb();
    const result = getSubjectSummary(db, 'nonexistent');
    expect(result).toBeNull();
  });

  it('returns summary for existing subject', async () => {
    const db = await createSeededDb();
    const result = getSubjectSummary(db, 'subj_01');

    expect(result).not.toBeNull();
    expect(result!.subjectId).toBe('subj_01');
    expect(result!.names.length).toBeGreaterThan(0);
    expect(result!.activeTradelineCount).toBe(1); // mortgage is open
    expect(result!.closedTradelineCount).toBe(0);
    expect(result!.latestScores).toHaveLength(1);
    expect(result!.latestScores[0].scoreValue).toBe(720);
    expect(result!.lastImportAt).toBeTruthy();
  });

  it('includes names with types', async () => {
    const db = await createSeededDb();
    const result = getSubjectSummary(db, 'subj_01')!;

    const legalName = result.names.find((n) => n.nameType === 'legal');
    expect(legalName).toBeDefined();
    expect(legalName!.fullName).toContain('Robert');
  });

  it('counts public records and fraud markers', async () => {
    const db = await createSeededDb();
    const result = getSubjectSummary(db, 'subj_01')!;

    expect(result.publicRecordCount).toBe(0); // example has no public records (property_record != public_record)
    expect(result.fraudMarkerCount).toBe(0);
  });
});
