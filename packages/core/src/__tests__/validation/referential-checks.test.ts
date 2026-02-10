import { describe, it, expect } from 'vitest';
import { checkReferentialIntegrity } from '../../validation/referential-checks.js';
import type { CreditFile } from '../../types/canonical.js';
import { buildMinimalCreditFile } from '../helpers/fixtures.js';

/** Cast fixture to CreditFile for the referential checker. */
function asFile(overrides?: Partial<Record<string, unknown>>): CreditFile {
  return buildMinimalCreditFile(overrides as Partial<CreditFile>) as CreditFile;
}

describe('checkReferentialIntegrity', () => {
  it('passes for a valid minimal file', () => {
    const result = checkReferentialIntegrity(asFile());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('detects broken source_import_id on subject names', () => {
    const file = asFile();
    file.subject.names = [
      {
        name_id: 'n1',
        full_name: 'Test',
        source_import_id: 'nonexistent_import',
      },
    ];

    const result = checkReferentialIntegrity(file);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('nonexistent_import'))).toBe(true);
  });

  it('detects broken address_id on address_associations', () => {
    const file = asFile();
    file.address_associations = [
      {
        association_id: 'a1',
        address_id: 'addr_does_not_exist',
        role: 'current',
        source_import_id: 'imp_test_001',
      },
    ];

    const result = checkReferentialIntegrity(file);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('addr_does_not_exist'))).toBe(true);
  });

  it('detects broken organisation_id on tradelines', () => {
    const file = asFile();
    file.tradelines = [
      {
        tradeline_id: 'tl1',
        furnisher_organisation_id: 'org_missing',
        source_import_id: 'imp_test_001',
      },
    ];

    const result = checkReferentialIntegrity(file);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('org_missing'))).toBe(true);
  });

  it('detects invalid period format on monthly metrics', () => {
    const file = asFile();
    file.tradelines = [
      {
        tradeline_id: 'tl1',
        source_import_id: 'imp_test_001',
        monthly_metrics: [
          {
            monthly_metric_id: 'mm1',
            period: '2025-13', // invalid month
            metric_type: 'payment_status',
            source_import_id: 'imp_test_001',
          },
        ],
      },
    ];

    const result = checkReferentialIntegrity(file);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('2025-13'))).toBe(true);
  });

  it('detects duplicate metric keys', () => {
    const file = asFile();
    file.tradelines = [
      {
        tradeline_id: 'tl1',
        source_import_id: 'imp_test_001',
        monthly_metrics: [
          {
            monthly_metric_id: 'mm1',
            period: '2025-12',
            metric_type: 'payment_status',
            value_text: '0',
            raw_status_code: '0',
            source_import_id: 'imp_test_001',
          },
          {
            monthly_metric_id: 'mm2',
            period: '2025-12',
            metric_type: 'payment_status',
            value_text: '0',
            raw_status_code: '0',
            source_import_id: 'imp_test_001',
          },
        ],
      },
    ];

    const result = checkReferentialIntegrity(file);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('duplicate'))).toBe(true);
  });

  it('validates address_links from/to address_ids', () => {
    const file = asFile();
    file.addresses = [{ address_id: 'addr_a' }];
    file.address_links = [
      {
        address_link_id: 'link1',
        from_address_id: 'addr_a',
        to_address_id: 'addr_missing',
        source_import_id: 'imp_test_001',
      },
    ];

    const result = checkReferentialIntegrity(file);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('addr_missing'))).toBe(true);
  });
});
