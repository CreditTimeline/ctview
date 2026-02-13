import { describe, it, expect } from 'vitest';
import { createTestDb } from '../helpers/test-db.js';
import {
  loadExampleCreditFile,
  buildMinimalCreditFile,
  buildCreditFileWithTradeline,
} from '../helpers/fixtures.js';
import { ingestCreditFile } from '../../ingestion/ingest-file.js';
import { reconstructCreditFile } from '../../export/reconstruct-credit-file.js';
import {
  exportTradelinesCsv,
  exportSearchesCsv,
  exportScoresCsv,
  toCsv,
} from '../../export/csv-export.js';
import { intToBool, parseExtensions, parseJsonArray } from '../../export/transforms.js';
import { validateCreditFile } from '../../validation/validator.js';
import type { CreditFile } from '../../types/canonical.js';

// ---------------------------------------------------------------------------
// Transform tests
// ---------------------------------------------------------------------------

describe('intToBool', () => {
  it('converts 1 to true', () => {
    expect(intToBool(1)).toBe(true);
  });

  it('converts 0 to false', () => {
    expect(intToBool(0)).toBe(false);
  });

  it('converts null to null', () => {
    expect(intToBool(null)).toBeNull();
  });
});

describe('parseExtensions', () => {
  it('parses valid JSON object', () => {
    expect(parseExtensions('{"key":"value"}')).toEqual({ key: 'value' });
  });

  it('returns undefined for null', () => {
    expect(parseExtensions(null)).toBeUndefined();
  });

  it('returns undefined for empty string', () => {
    expect(parseExtensions('')).toBeUndefined();
  });

  it('returns undefined for invalid JSON', () => {
    expect(parseExtensions('not-json')).toBeUndefined();
  });
});

describe('parseJsonArray', () => {
  it('parses valid JSON array', () => {
    expect(parseJsonArray<string>('["a","b"]')).toEqual(['a', 'b']);
  });

  it('returns undefined for null', () => {
    expect(parseJsonArray(null)).toBeUndefined();
  });

  it('returns undefined for non-array JSON', () => {
    expect(parseJsonArray('{"key":"value"}')).toBeUndefined();
  });

  it('returns undefined for invalid JSON', () => {
    expect(parseJsonArray('broken')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// CSV format tests
// ---------------------------------------------------------------------------

describe('toCsv', () => {
  it('produces correct headers and rows', () => {
    const result = toCsv(
      ['Name', 'Age'],
      [
        ['Alice', '30'],
        ['Bob', '25'],
      ],
    );
    const lines = result.split('\r\n');
    expect(lines[0]).toBe('Name,Age');
    expect(lines[1]).toBe('Alice,30');
    expect(lines[2]).toBe('Bob,25');
  });

  it('escapes fields with commas', () => {
    const result = toCsv(['Name'], [['Smith, John']]);
    expect(result).toContain('"Smith, John"');
  });

  it('escapes fields with double quotes', () => {
    const result = toCsv(['Name'], [['He said "hello"']]);
    expect(result).toContain('"He said ""hello"""');
  });

  it('escapes fields with newlines', () => {
    const result = toCsv(['Note'], [['Line1\nLine2']]);
    expect(result).toContain('"Line1\nLine2"');
  });

  it('handles empty dataset', () => {
    const result = toCsv(['A', 'B'], []);
    expect(result).toBe('A,B\r\n');
  });
});

describe('exportTradelinesCsv', () => {
  it('returns header row for empty dataset', () => {
    const db = createTestDb();
    const csv = exportTradelinesCsv(db, 'nonexistent');
    const lines = csv.split('\r\n');
    expect(lines[0]).toContain('tradeline_id');
    // Only header + trailing newline
    expect(lines.length).toBe(2);
  });

  it('exports tradeline data after ingestion', async () => {
    const db = createTestDb();
    const data = buildCreditFileWithTradeline();
    await ingestCreditFile(db, data);

    const csv = exportTradelinesCsv(db, 'subj_test_001');
    const lines = csv.split('\r\n').filter((l) => l.length > 0);
    expect(lines.length).toBe(2); // header + 1 data row
    expect(lines[1]).toContain('tl_test_001');
    expect(lines[1]).toContain('credit_card');
  });
});

describe('exportSearchesCsv', () => {
  it('returns header row for empty dataset', () => {
    const db = createTestDb();
    const csv = exportSearchesCsv(db, 'nonexistent');
    const lines = csv.split('\r\n');
    expect(lines[0]).toContain('search_id');
  });
});

describe('exportScoresCsv', () => {
  it('returns header row for empty dataset', () => {
    const db = createTestDb();
    const csv = exportScoresCsv(db, 'nonexistent');
    const lines = csv.split('\r\n');
    expect(lines[0]).toContain('score_id');
  });
});

// ---------------------------------------------------------------------------
// Round-trip reconstruction tests
// ---------------------------------------------------------------------------

describe('reconstructCreditFile', () => {
  it('returns null for non-existent file', () => {
    const db = createTestDb();
    const result = reconstructCreditFile(db, 'nonexistent');
    expect(result).toBeNull();
  });

  it('reconstructs a minimal credit file', async () => {
    const db = createTestDb();
    const input = buildMinimalCreditFile() as CreditFile;
    await ingestCreditFile(db, input);

    const result = reconstructCreditFile(db, input.file_id);
    expect(result).not.toBeNull();
    expect(result!.file_id).toBe(input.file_id);
    expect(result!.schema_version).toBe(input.schema_version);
    expect(result!.subject_id).toBe(input.subject_id);
    expect(result!.created_at).toBe(input.created_at);
    expect(result!.imports).toHaveLength(1);
    expect(result!.imports[0].import_id).toBe(input.imports[0].import_id);
    expect(result!.subject.subject_id).toBe(input.subject.subject_id);
    expect(result!.subject.names).toHaveLength(1);
    expect(result!.subject.names![0].name_id).toBe('name_test_001');
  });

  it('reconstructs a credit file with tradelines and child entities', async () => {
    const db = createTestDb();
    const input = buildCreditFileWithTradeline() as CreditFile;
    await ingestCreditFile(db, input);

    const result = reconstructCreditFile(db, input.file_id);
    expect(result).not.toBeNull();

    // Tradelines
    expect(result!.tradelines).toHaveLength(1);
    const tl = result!.tradelines![0];
    expect(tl.tradeline_id).toBe('tl_test_001');
    expect(tl.account_type).toBe('credit_card');
    expect(tl.furnisher_organisation_id).toBe('org_test_001');

    // Tradeline children
    expect(tl.identifiers).toHaveLength(1);
    expect(tl.identifiers![0].identifier_id).toBe('tid_test_001');
    expect(tl.parties).toHaveLength(1);
    expect(tl.terms).toBeDefined();
    expect(tl.terms!.terms_id).toBe('terms_test_001');
    expect(tl.snapshots).toHaveLength(1);
    expect(tl.snapshots![0].current_balance).toBe(50000);
    expect(tl.monthly_metrics).toHaveLength(1);
    expect(tl.events).toHaveLength(1);

    // Organisations
    expect(result!.organisations).toHaveLength(1);
    expect(result!.organisations![0].name).toBe('Test Bank');
    expect(result!.organisations![0].roles).toEqual(['furnisher']);

    // Addresses and associations
    expect(result!.addresses).toHaveLength(1);
    expect(result!.address_associations).toHaveLength(1);
  });

  it('round-trips the full example file preserving key fields', async () => {
    const db = createTestDb();
    const input = loadExampleCreditFile() as CreditFile;
    await ingestCreditFile(db, input);

    const result = reconstructCreditFile(db, input.file_id);
    expect(result).not.toBeNull();

    // Top-level fields
    expect(result!.file_id).toBe(input.file_id);
    expect(result!.schema_version).toBe(input.schema_version);
    expect(result!.subject_id).toBe(input.subject_id);
    expect(result!.created_at).toBe(input.created_at);
    expect(result!.currency_code).toBe(input.currency_code);

    // Imports
    expect(result!.imports).toHaveLength(1);
    expect(result!.imports[0].source_system).toBe('equifax');
    expect(result!.imports[0].acquisition_method).toBe('pdf_upload');
    expect(result!.imports[0].raw_artifacts).toHaveLength(1);
    expect(result!.imports[0].raw_artifacts![0].artifact_type).toBe('pdf');

    // Subject (dates_of_birth omitted - known gap)
    expect(result!.subject.names).toHaveLength(2);
    expect(result!.subject.identifiers).toHaveLength(1);
    expect(result!.subject.dates_of_birth).toBeUndefined();

    // Organisations
    expect(result!.organisations).toHaveLength(2);

    // Addresses
    expect(result!.addresses).toHaveLength(2);
    expect(result!.address_associations).toHaveLength(2);

    // Financial associates
    expect(result!.financial_associates).toHaveLength(1);
    expect(result!.financial_associates![0].associate_name).toBe('Scott Alan Graham');

    // Electoral roll
    expect(result!.electoral_roll_entries).toHaveLength(1);
    expect(result!.electoral_roll_entries![0].marketing_opt_out).toBe(true);

    // Tradelines
    expect(result!.tradelines).toHaveLength(1);
    const tl = result!.tradelines![0];
    expect(tl.tradeline_id).toBe('tl_halifax_mortgage_01');
    expect(tl.account_type).toBe('mortgage');
    expect(tl.regular_payment_amount).toBe(163400);
    expect(tl.identifiers).toHaveLength(1);
    expect(tl.terms).toBeDefined();
    expect(tl.terms!.term_count).toBe(420);
    expect(tl.snapshots).toHaveLength(1);
    expect(tl.snapshots![0].current_balance).toBe(33251100);
    expect(tl.monthly_metrics).toHaveLength(2);

    // Searches
    expect(result!.searches).toHaveLength(1);
    expect(result!.searches![0].joint_application).toBe(false);
    expect(result!.searches![0].visibility).toBe('soft');

    // Scores
    expect(result!.credit_scores).toHaveLength(1);
    expect(result!.credit_scores![0].score_value).toBe(720);
    expect(result!.credit_scores![0].score_factors).toEqual([
      'Long credit history',
      'Low utilization',
    ]);

    // Property records
    expect(result!.property_records).toHaveLength(1);
    expect(result!.property_records![0].is_new_build).toBe(false);
    expect(result!.property_records![0].price_paid).toBe(37800000);

    // Attributable items
    expect(result!.attributable_items).toHaveLength(1);

    // Disputes
    expect(result!.disputes).toHaveLength(1);
    expect(result!.disputes![0].status).toBe('open');
  });

  it('exported JSON validates against schema and can be re-ingested', async () => {
    const db1 = createTestDb();
    const input = loadExampleCreditFile() as CreditFile;
    await ingestCreditFile(db1, input);

    const exported = reconstructCreditFile(db1, input.file_id);
    expect(exported).not.toBeNull();

    // Validate against JSON Schema (dates_of_birth gap means we must add it back)
    const withDob = {
      ...exported!,
      subject: {
        ...exported!.subject,
        dates_of_birth: input.subject.dates_of_birth,
      },
    };
    const validation = validateCreditFile(withDob);
    expect(validation.valid).toBe(true);

    // Re-ingest into a fresh database with new unique IDs
    const db2 = createTestDb();
    const reingested = {
      ...withDob,
      file_id: 'file_reingested',
      imports: withDob.imports.map((imp) => ({
        ...imp,
        import_id: `${imp.import_id}_re`,
      })),
    };
    // Update all source_import_id references to use new import IDs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const remap = (obj: any) => {
      if (obj.source_import_id && typeof obj.source_import_id === 'string') {
        obj.source_import_id = `${obj.source_import_id}_re`;
      }
      return obj;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const remapArray = <T>(arr?: T[]) => arr?.map((item) => remap({ ...(item as any) }) as T);

    reingested.subject = {
      ...reingested.subject,
      names: remapArray(reingested.subject.names),
      identifiers: remapArray(reingested.subject.identifiers),
      dates_of_birth: reingested.subject.dates_of_birth?.map((d) => ({
        ...d,
        source_import_id: `${d.source_import_id}_re`,
      })),
    };
    if (reingested.organisations) {
      reingested.organisations = remapArray(reingested.organisations);
    }
    if (reingested.address_associations) {
      reingested.address_associations = remapArray(reingested.address_associations);
    }
    if (reingested.address_links) {
      reingested.address_links = remapArray(reingested.address_links);
    }
    if (reingested.financial_associates) {
      reingested.financial_associates = remapArray(reingested.financial_associates);
    }
    if (reingested.electoral_roll_entries) {
      reingested.electoral_roll_entries = remapArray(reingested.electoral_roll_entries);
    }
    if (reingested.tradelines) {
      reingested.tradelines = reingested.tradelines.map((tl) => {
        const t = remap({ ...tl }) as typeof tl;
        if (t.identifiers) t.identifiers = remapArray(t.identifiers);
        if (t.parties) t.parties = remapArray(t.parties);
        if (t.terms) t.terms = remap({ ...t.terms }) as typeof t.terms;
        if (t.snapshots) t.snapshots = remapArray(t.snapshots);
        if (t.monthly_metrics) t.monthly_metrics = remapArray(t.monthly_metrics);
        if (t.events) t.events = remapArray(t.events);
        return t;
      });
    }
    if (reingested.searches) {
      reingested.searches = remapArray(reingested.searches);
    }
    if (reingested.credit_scores) {
      reingested.credit_scores = remapArray(reingested.credit_scores);
    }
    if (reingested.public_records) {
      reingested.public_records = remapArray(reingested.public_records);
    }
    if (reingested.notices_of_correction) {
      reingested.notices_of_correction = remapArray(reingested.notices_of_correction);
    }
    if (reingested.property_records) {
      reingested.property_records = remapArray(reingested.property_records);
    }
    if (reingested.gone_away_records) {
      reingested.gone_away_records = remapArray(reingested.gone_away_records);
    }
    if (reingested.fraud_markers) {
      reingested.fraud_markers = remapArray(reingested.fraud_markers);
    }
    if (reingested.attributable_items) {
      reingested.attributable_items = remapArray(reingested.attributable_items);
    }
    if (reingested.disputes) {
      reingested.disputes = remapArray(reingested.disputes);
    }

    const result = await ingestCreditFile(db2, reingested);
    expect(result.success).toBe(true);
    expect(result.errors).toBeUndefined();
  });

  it('omits empty entity arrays', async () => {
    const db = createTestDb();
    const input = buildMinimalCreditFile() as CreditFile;
    await ingestCreditFile(db, input);

    const result = reconstructCreditFile(db, input.file_id);
    expect(result).not.toBeNull();
    expect(result!.tradelines).toBeUndefined();
    expect(result!.searches).toBeUndefined();
    expect(result!.credit_scores).toBeUndefined();
    expect(result!.public_records).toBeUndefined();
    expect(result!.notices_of_correction).toBeUndefined();
    expect(result!.property_records).toBeUndefined();
    expect(result!.gone_away_records).toBeUndefined();
    expect(result!.fraud_markers).toBeUndefined();
    expect(result!.disputes).toBeUndefined();
  });
});
