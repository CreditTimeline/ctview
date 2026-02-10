import type { CreditFile } from '../types/canonical.js';
import { deriveMetricValueKey } from '../ingestion/derive-metric-key.js';

export interface ReferentialCheckResult {
  valid: boolean;
  errors: string[];
}

const PERIOD_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * Validates internal cross-references within a credit file payload.
 * Runs AFTER JSON Schema validation passes, so we can assume structural correctness.
 *
 * Checks:
 * 1. All source_import_id values resolve to an entry in imports[]
 * 2. All address_id references resolve to addresses[]
 * 3. All organisation_id references resolve to organisations[]
 * 4. All period values are valid YYYY-MM format
 * 5. No duplicate (tradeline_id, period, metric_type, source_import_id, derived_key) tuples
 */
export function checkReferentialIntegrity(data: CreditFile): ReferentialCheckResult {
  const errors: string[] = [];

  // Build lookup sets
  const validImportIds = new Set(data.imports.map((i) => i.import_id));
  const validAddressIds = new Set((data.addresses ?? []).map((a) => a.address_id));
  const validOrgIds = new Set((data.organisations ?? []).map((o) => o.organisation_id));

  // 1. Check source_import_id resolution across all entity arrays
  checkSourceImportIds(data, validImportIds, errors);

  // 2. Check address_id resolution
  checkAddressIds(data, validAddressIds, errors);

  // 3. Check organisation_id resolution
  checkOrganisationIds(data, validOrgIds, errors);

  // 4. Check period format on monthly metrics
  checkPeriodFormats(data, errors);

  // 5. Check for duplicate metric keys
  checkDuplicateMetrics(data, errors);

  return { valid: errors.length === 0, errors };
}

function checkImportId(
  importId: string,
  validIds: Set<string>,
  entityPath: string,
  errors: string[],
): void {
  if (!validIds.has(importId)) {
    errors.push(`${entityPath}: source_import_id "${importId}" not found in imports[]`);
  }
}

function checkSourceImportIds(data: CreditFile, validIds: Set<string>, errors: string[]): void {
  // Subject children
  for (const n of data.subject.names ?? []) {
    checkImportId(n.source_import_id, validIds, `subject.names[${n.name_id}]`, errors);
  }
  for (const dob of data.subject.dates_of_birth ?? []) {
    checkImportId(dob.source_import_id, validIds, `subject.dates_of_birth[${dob.dob}]`, errors);
  }
  for (const id of data.subject.identifiers ?? []) {
    checkImportId(
      id.source_import_id,
      validIds,
      `subject.identifiers[${id.identifier_id}]`,
      errors,
    );
  }

  // Top-level entity arrays with source_import_id
  for (const o of data.organisations ?? []) {
    if (o.source_import_id) {
      checkImportId(o.source_import_id, validIds, `organisations[${o.organisation_id}]`, errors);
    }
  }
  for (const a of data.address_associations ?? []) {
    checkImportId(
      a.source_import_id,
      validIds,
      `address_associations[${a.association_id}]`,
      errors,
    );
  }
  for (const l of data.address_links ?? []) {
    checkImportId(l.source_import_id, validIds, `address_links[${l.address_link_id}]`, errors);
  }
  for (const f of data.financial_associates ?? []) {
    checkImportId(f.source_import_id, validIds, `financial_associates[${f.associate_id}]`, errors);
  }
  for (const e of data.electoral_roll_entries ?? []) {
    checkImportId(
      e.source_import_id,
      validIds,
      `electoral_roll_entries[${e.electoral_entry_id}]`,
      errors,
    );
  }

  // Tradelines + children
  for (const t of data.tradelines ?? []) {
    checkImportId(t.source_import_id, validIds, `tradelines[${t.tradeline_id}]`, errors);
    for (const id of t.identifiers ?? []) {
      checkImportId(
        id.source_import_id,
        validIds,
        `tradelines[${t.tradeline_id}].identifiers[${id.identifier_id}]`,
        errors,
      );
    }
    for (const p of t.parties ?? []) {
      checkImportId(
        p.source_import_id,
        validIds,
        `tradelines[${t.tradeline_id}].parties[${p.party_id}]`,
        errors,
      );
    }
    if (t.terms) {
      checkImportId(
        t.terms.source_import_id,
        validIds,
        `tradelines[${t.tradeline_id}].terms`,
        errors,
      );
    }
    for (const s of t.snapshots ?? []) {
      checkImportId(
        s.source_import_id,
        validIds,
        `tradelines[${t.tradeline_id}].snapshots[${s.snapshot_id}]`,
        errors,
      );
    }
    for (const m of t.monthly_metrics ?? []) {
      checkImportId(
        m.source_import_id,
        validIds,
        `tradelines[${t.tradeline_id}].monthly_metrics[${m.monthly_metric_id}]`,
        errors,
      );
    }
    for (const e of t.events ?? []) {
      checkImportId(
        e.source_import_id,
        validIds,
        `tradelines[${t.tradeline_id}].events[${e.event_id}]`,
        errors,
      );
    }
  }

  // Records
  for (const s of data.searches ?? []) {
    checkImportId(s.source_import_id, validIds, `searches[${s.search_id}]`, errors);
  }
  for (const c of data.credit_scores ?? []) {
    checkImportId(c.source_import_id, validIds, `credit_scores[${c.score_id}]`, errors);
  }
  for (const p of data.public_records ?? []) {
    checkImportId(p.source_import_id, validIds, `public_records[${p.public_record_id}]`, errors);
  }
  for (const n of data.notices_of_correction ?? []) {
    checkImportId(n.source_import_id, validIds, `notices_of_correction[${n.notice_id}]`, errors);
  }
  for (const p of data.property_records ?? []) {
    checkImportId(
      p.source_import_id,
      validIds,
      `property_records[${p.property_record_id}]`,
      errors,
    );
  }
  for (const g of data.gone_away_records ?? []) {
    checkImportId(g.source_import_id, validIds, `gone_away_records[${g.gone_away_id}]`, errors);
  }
  for (const f of data.fraud_markers ?? []) {
    checkImportId(f.source_import_id, validIds, `fraud_markers[${f.fraud_marker_id}]`, errors);
  }
  for (const a of data.attributable_items ?? []) {
    checkImportId(
      a.source_import_id,
      validIds,
      `attributable_items[${a.attributable_item_id}]`,
      errors,
    );
  }
  for (const d of data.disputes ?? []) {
    checkImportId(d.source_import_id, validIds, `disputes[${d.dispute_id}]`, errors);
  }
}

function checkAddressIds(data: CreditFile, validIds: Set<string>, errors: string[]): void {
  for (const a of data.address_associations ?? []) {
    if (!validIds.has(a.address_id)) {
      errors.push(
        `address_associations[${a.association_id}]: address_id "${a.address_id}" not found in addresses[]`,
      );
    }
  }
  for (const l of data.address_links ?? []) {
    if (!validIds.has(l.from_address_id)) {
      errors.push(
        `address_links[${l.address_link_id}]: from_address_id "${l.from_address_id}" not found in addresses[]`,
      );
    }
    if (!validIds.has(l.to_address_id)) {
      errors.push(
        `address_links[${l.address_link_id}]: to_address_id "${l.to_address_id}" not found in addresses[]`,
      );
    }
  }
  for (const e of data.electoral_roll_entries ?? []) {
    if (e.address_id && !validIds.has(e.address_id)) {
      errors.push(
        `electoral_roll_entries[${e.electoral_entry_id}]: address_id "${e.address_id}" not found in addresses[]`,
      );
    }
  }
  for (const s of data.searches ?? []) {
    if (s.input_address_id && !validIds.has(s.input_address_id)) {
      errors.push(
        `searches[${s.search_id}]: input_address_id "${s.input_address_id}" not found in addresses[]`,
      );
    }
  }
  for (const p of data.public_records ?? []) {
    if (p.address_id && !validIds.has(p.address_id)) {
      errors.push(
        `public_records[${p.public_record_id}]: address_id "${p.address_id}" not found in addresses[]`,
      );
    }
  }
  for (const p of data.property_records ?? []) {
    if (p.address_id && !validIds.has(p.address_id)) {
      errors.push(
        `property_records[${p.property_record_id}]: address_id "${p.address_id}" not found in addresses[]`,
      );
    }
  }
  for (const g of data.gone_away_records ?? []) {
    if (g.old_address_id && !validIds.has(g.old_address_id)) {
      errors.push(
        `gone_away_records[${g.gone_away_id}]: old_address_id "${g.old_address_id}" not found in addresses[]`,
      );
    }
    if (g.new_address_id && !validIds.has(g.new_address_id)) {
      errors.push(
        `gone_away_records[${g.gone_away_id}]: new_address_id "${g.new_address_id}" not found in addresses[]`,
      );
    }
  }
  for (const f of data.fraud_markers ?? []) {
    if (f.address_id && !validIds.has(f.address_id)) {
      errors.push(
        `fraud_markers[${f.fraud_marker_id}]: address_id "${f.address_id}" not found in addresses[]`,
      );
    }
  }
}

function checkOrganisationIds(data: CreditFile, validIds: Set<string>, errors: string[]): void {
  for (const t of data.tradelines ?? []) {
    if (t.furnisher_organisation_id && !validIds.has(t.furnisher_organisation_id)) {
      errors.push(
        `tradelines[${t.tradeline_id}]: furnisher_organisation_id "${t.furnisher_organisation_id}" not found in organisations[]`,
      );
    }
  }
  for (const s of data.searches ?? []) {
    if (s.organisation_id && !validIds.has(s.organisation_id)) {
      errors.push(
        `searches[${s.search_id}]: organisation_id "${s.organisation_id}" not found in organisations[]`,
      );
    }
  }
}

function checkPeriodFormats(data: CreditFile, errors: string[]): void {
  for (const t of data.tradelines ?? []) {
    for (const m of t.monthly_metrics ?? []) {
      if (!PERIOD_REGEX.test(m.period)) {
        errors.push(
          `tradelines[${t.tradeline_id}].monthly_metrics[${m.monthly_metric_id}]: period "${m.period}" is not valid YYYY-MM format`,
        );
      }
    }
  }
}

function checkDuplicateMetrics(data: CreditFile, errors: string[]): void {
  for (const t of data.tradelines ?? []) {
    const seen = new Set<string>();
    for (const m of t.monthly_metrics ?? []) {
      const key = deriveMetricValueKey(m);
      const composite = `${t.tradeline_id}|${m.period}|${m.metric_type}|${m.source_import_id}|${key}`;
      if (seen.has(composite)) {
        errors.push(
          `tradelines[${t.tradeline_id}].monthly_metrics[${m.monthly_metric_id}]: duplicate metric key (${m.period}, ${m.metric_type}, ${key})`,
        );
      }
      seen.add(composite);
    }
  }
}
