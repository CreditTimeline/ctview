import {
  organisation,
  tradeline,
  tradelineIdentifier,
  tradelineParty,
  tradelineTerms,
  tradelineSnapshot,
  tradelineMonthlyMetric,
  tradelineEvent,
} from '../../schema/sqlite/index.js';
import { toJsonText, boolToInt } from '../transforms.js';
import { deriveMetricValueKey } from '../derive-metric-key.js';
import type { IngestContext } from '../ingest-context.js';

export function insertOrganisations(ctx: IngestContext): void {
  const orgs = ctx.file.organisations ?? [];
  if (!orgs.length) return;

  for (const o of orgs) {
    ctx.tx
      .insert(organisation)
      .values({
        organisation_id: o.organisation_id,
        subject_id: ctx.subjectId,
        name: o.name,
        roles_json: toJsonText(o.roles),
        industry_type: o.industry_type,
        source_import_id: o.source_import_id,
        source_system: o.source_import_id
          ? ctx.sourceSystemByImportId.get(o.source_import_id)
          : undefined,
        extensions_json: toJsonText(o.extensions),
      })
      .run();
  }
  ctx.entityCounts.organisations = orgs.length;
}

export function insertTradelines(ctx: IngestContext): void {
  const tls = ctx.file.tradelines ?? [];
  if (!tls.length) return;

  let identifierCount = 0;
  let partyCount = 0;
  let termsCount = 0;
  let snapshotCount = 0;
  let metricCount = 0;
  let eventCount = 0;

  for (const t of tls) {
    const sourceSystem = ctx.sourceSystemByImportId.get(t.source_import_id)!;

    // Insert tradeline
    ctx.tx
      .insert(tradeline)
      .values({
        tradeline_id: t.tradeline_id,
        canonical_id: t.canonical_id,
        subject_id: ctx.subjectId,
        furnisher_organisation_id: t.furnisher_organisation_id,
        furnisher_name_raw: t.furnisher_name_raw,
        account_type: t.account_type,
        opened_at: t.opened_at,
        closed_at: t.closed_at,
        status_current: t.status_current,
        repayment_frequency: t.repayment_frequency,
        regular_payment_amount: t.regular_payment_amount,
        supplementary_info: t.supplementary_info,
        source_import_id: t.source_import_id,
        source_system: sourceSystem,
        extensions_json: toJsonText(t.extensions),
      })
      .run();

    // Identifiers
    for (const id of t.identifiers ?? []) {
      ctx.tx
        .insert(tradelineIdentifier)
        .values({
          identifier_id: id.identifier_id,
          tradeline_id: t.tradeline_id,
          identifier_type: id.identifier_type,
          value: id.value,
          source_import_id: id.source_import_id,
          source_system: ctx.sourceSystemByImportId.get(id.source_import_id)!,
          extensions_json: toJsonText(id.extensions),
        })
        .run();
      identifierCount++;
    }

    // Parties
    for (const p of t.parties ?? []) {
      ctx.tx
        .insert(tradelineParty)
        .values({
          party_id: p.party_id,
          tradeline_id: t.tradeline_id,
          party_role: p.party_role,
          name: p.name,
          source_import_id: p.source_import_id,
          source_system: ctx.sourceSystemByImportId.get(p.source_import_id)!,
          extensions_json: toJsonText(p.extensions),
        })
        .run();
      partyCount++;
    }

    // Terms (singular object, not array)
    if (t.terms) {
      ctx.tx
        .insert(tradelineTerms)
        .values({
          terms_id: t.terms.terms_id,
          tradeline_id: t.tradeline_id,
          term_type: t.terms.term_type,
          term_count: t.terms.term_count,
          term_payment_amount: t.terms.term_payment_amount,
          payment_start_date: t.terms.payment_start_date,
          source_import_id: t.terms.source_import_id,
          source_system: ctx.sourceSystemByImportId.get(t.terms.source_import_id)!,
          extensions_json: toJsonText(t.terms.extensions),
        })
        .run();
      termsCount++;
    }

    // Snapshots
    for (const s of t.snapshots ?? []) {
      ctx.tx
        .insert(tradelineSnapshot)
        .values({
          snapshot_id: s.snapshot_id,
          tradeline_id: t.tradeline_id,
          as_of_date: s.as_of_date,
          status_current: s.status_current,
          source_account_ref: s.source_account_ref,
          current_balance: s.current_balance,
          opening_balance: s.opening_balance,
          credit_limit: s.credit_limit,
          delinquent_balance: s.delinquent_balance,
          payment_amount: s.payment_amount,
          statement_balance: s.statement_balance,
          minimum_payment_received: boolToInt(s.minimum_payment_received),
          cash_advance_amount: s.cash_advance_amount,
          cash_advance_count: s.cash_advance_count,
          credit_limit_change: s.credit_limit_change,
          promotional_rate_flag: boolToInt(s.promotional_rate_flag),
          source_import_id: s.source_import_id,
          source_system: ctx.sourceSystemByImportId.get(s.source_import_id)!,
          extensions_json: toJsonText(s.extensions),
        })
        .run();
      snapshotCount++;
    }

    // Monthly metrics (with derived metric_value_key)
    for (const m of t.monthly_metrics ?? []) {
      ctx.tx
        .insert(tradelineMonthlyMetric)
        .values({
          monthly_metric_id: m.monthly_metric_id,
          tradeline_id: t.tradeline_id,
          period: m.period,
          metric_type: m.metric_type,
          value_numeric: m.value_numeric,
          value_text: m.value_text,
          canonical_status: m.canonical_status,
          raw_status_code: m.raw_status_code,
          reported_at: m.reported_at,
          metric_value_key: deriveMetricValueKey(m),
          source_import_id: m.source_import_id,
          source_system: ctx.sourceSystemByImportId.get(m.source_import_id)!,
          extensions_json: toJsonText(m.extensions),
        })
        .run();
      metricCount++;
    }

    // Events
    for (const e of t.events ?? []) {
      ctx.tx
        .insert(tradelineEvent)
        .values({
          event_id: e.event_id,
          tradeline_id: t.tradeline_id,
          event_type: e.event_type,
          event_date: e.event_date,
          amount: e.amount,
          notes: e.notes,
          source_import_id: e.source_import_id,
          source_system: ctx.sourceSystemByImportId.get(e.source_import_id)!,
          extensions_json: toJsonText(e.extensions),
        })
        .run();
      eventCount++;
    }
  }

  ctx.entityCounts.tradelines = tls.length;
  ctx.entityCounts.tradeline_identifiers = identifierCount;
  ctx.entityCounts.tradeline_parties = partyCount;
  ctx.entityCounts.tradeline_terms = termsCount;
  ctx.entityCounts.tradeline_snapshots = snapshotCount;
  ctx.entityCounts.tradeline_monthly_metrics = metricCount;
  ctx.entityCounts.tradeline_events = eventCount;
}
