import { sql, eq, and, type SQL } from 'drizzle-orm';
import type { AppDatabase } from '../db/client.js';
import {
  tradeline,
  organisation,
  tradelineIdentifier,
  tradelineParty,
  tradelineTerms,
  tradelineSnapshot,
  tradelineEvent,
  tradelineMonthlyMetric,
} from '../schema/sqlite/tradelines.js';
import { paginate } from './helpers.js';
import type {
  TradelineListParams,
  PaginatedResult,
  TradelineSummary,
  TradelineDetail,
  TradelineMetricsParams,
  TradelineMetricSeries,
} from './types.js';

export function listTradelines(
  db: AppDatabase,
  params: TradelineListParams,
): PaginatedResult<TradelineSummary> {
  const { limit, offset, subjectId, accountType, status, sourceSystem } = params;

  const conditions: SQL[] = [];
  if (subjectId) conditions.push(sql`t.subject_id = ${subjectId}`);
  if (accountType) conditions.push(sql`t.account_type = ${accountType}`);
  if (status) conditions.push(sql`t.status_current = ${status}`);
  if (sourceSystem) conditions.push(sql`t.source_system = ${sourceSystem}`);

  const where =
    conditions.length > 0 ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``;

  interface Row {
    tradeline_id: string;
    canonical_id: string | null;
    furnisher_name: string | null;
    account_type: string | null;
    opened_at: string | null;
    closed_at: string | null;
    status_current: string | null;
    source_system: string;
    latest_balance: number | null;
    latest_credit_limit: number | null;
    latest_snapshot_date: string | null;
  }

  const rows = db.all<Row>(sql`
    SELECT
      t.tradeline_id,
      t.canonical_id,
      COALESCE(o.name, t.furnisher_name_raw) AS furnisher_name,
      t.account_type,
      t.opened_at,
      t.closed_at,
      t.status_current,
      t.source_system,
      snap.current_balance AS latest_balance,
      snap.credit_limit AS latest_credit_limit,
      snap.as_of_date AS latest_snapshot_date
    FROM tradeline t
    LEFT JOIN organisation o ON o.organisation_id = t.furnisher_organisation_id
    LEFT JOIN (
      SELECT tradeline_id, current_balance, credit_limit, as_of_date,
             ROW_NUMBER() OVER (PARTITION BY tradeline_id ORDER BY as_of_date DESC) AS rn
      FROM tradeline_snapshot
    ) snap ON snap.tradeline_id = t.tradeline_id AND snap.rn = 1
    ${where}
    ORDER BY t.opened_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `);

  const totalRow = db.all<{ count: number }>(sql`
    SELECT COUNT(*) as count FROM tradeline t ${where}
  `);
  const total = totalRow[0]?.count ?? 0;

  const items: TradelineSummary[] = rows.map((r) => ({
    tradelineId: r.tradeline_id,
    canonicalId: r.canonical_id,
    furnisherName: r.furnisher_name,
    accountType: r.account_type,
    openedAt: r.opened_at,
    closedAt: r.closed_at,
    statusCurrent: r.status_current,
    sourceSystem: r.source_system,
    latestBalance: r.latest_balance,
    latestCreditLimit: r.latest_credit_limit,
    latestSnapshotDate: r.latest_snapshot_date,
  }));

  return paginate(items, total, limit, offset);
}

export function getTradelineDetail(
  db: AppDatabase,
  tradelineId: string,
): TradelineDetail | null {
  // Use multiple targeted queries instead of relational API for type safety
  const tl = db
    .select()
    .from(tradeline)
    .where(eq(tradeline.tradeline_id, tradelineId))
    .get();
  if (!tl) return null;

  // Furnisher org name
  const org = tl.furnisher_organisation_id
    ? db
        .select({ name: organisation.name })
        .from(organisation)
        .where(eq(organisation.organisation_id, tl.furnisher_organisation_id))
        .get()
    : null;

  const identifiers = db
    .select()
    .from(tradelineIdentifier)
    .where(eq(tradelineIdentifier.tradeline_id, tradelineId))
    .all();

  const parties = db
    .select()
    .from(tradelineParty)
    .where(eq(tradelineParty.tradeline_id, tradelineId))
    .all();

  const terms = db
    .select()
    .from(tradelineTerms)
    .where(eq(tradelineTerms.tradeline_id, tradelineId))
    .all();

  const snapshots = db
    .select()
    .from(tradelineSnapshot)
    .where(eq(tradelineSnapshot.tradeline_id, tradelineId))
    .orderBy(sql`${tradelineSnapshot.as_of_date} DESC`)
    .all();

  const events = db
    .select()
    .from(tradelineEvent)
    .where(eq(tradelineEvent.tradeline_id, tradelineId))
    .orderBy(sql`${tradelineEvent.event_date} DESC`)
    .all();

  // Cross-agency peers: tradelines sharing the same canonical_id
  let crossAgencyPeers: TradelineDetail['crossAgencyPeers'] = [];
  if (tl.canonical_id) {
    interface PeerRow {
      tradeline_id: string;
      source_system: string;
      furnisher_name: string | null;
    }
    const peers = db.all<PeerRow>(sql`
      SELECT t.tradeline_id, t.source_system,
             COALESCE(o.name, t.furnisher_name_raw) AS furnisher_name
      FROM tradeline t
      LEFT JOIN organisation o ON o.organisation_id = t.furnisher_organisation_id
      WHERE t.canonical_id = ${tl.canonical_id}
        AND t.tradeline_id != ${tradelineId}
    `);
    crossAgencyPeers = peers.map((p) => ({
      tradelineId: p.tradeline_id,
      sourceSystem: p.source_system,
      furnisherName: p.furnisher_name,
    }));
  }

  return {
    tradelineId: tl.tradeline_id,
    canonicalId: tl.canonical_id,
    subjectId: tl.subject_id,
    furnisherName: org?.name ?? null,
    furnisherNameRaw: tl.furnisher_name_raw,
    accountType: tl.account_type,
    openedAt: tl.opened_at,
    closedAt: tl.closed_at,
    statusCurrent: tl.status_current,
    repaymentFrequency: tl.repayment_frequency,
    regularPaymentAmount: tl.regular_payment_amount,
    sourceSystem: tl.source_system,
    identifiers: identifiers.map((id) => ({
      identifierId: id.identifier_id,
      identifierType: id.identifier_type,
      value: id.value,
    })),
    parties: parties.map((p) => ({
      partyId: p.party_id,
      partyRole: p.party_role,
      name: p.name,
    })),
    terms: terms.map((t) => ({
      termsId: t.terms_id,
      termType: t.term_type,
      termCount: t.term_count,
      termPaymentAmount: t.term_payment_amount,
      paymentStartDate: t.payment_start_date,
    })),
    snapshots: snapshots.map((s) => ({
      snapshotId: s.snapshot_id,
      asOfDate: s.as_of_date,
      statusCurrent: s.status_current,
      currentBalance: s.current_balance,
      openingBalance: s.opening_balance,
      creditLimit: s.credit_limit,
      delinquentBalance: s.delinquent_balance,
      paymentAmount: s.payment_amount,
    })),
    events: events.map((e) => ({
      eventId: e.event_id,
      eventType: e.event_type,
      eventDate: e.event_date,
      amount: e.amount,
      notes: e.notes,
    })),
    crossAgencyPeers,
  };
}

export function getTradelineMetrics(
  db: AppDatabase,
  tradelineId: string,
  params?: TradelineMetricsParams,
): TradelineMetricSeries {
  const conditions: SQL[] = [eq(tradelineMonthlyMetric.tradeline_id, tradelineId)];

  if (params?.metricType) {
    conditions.push(eq(tradelineMonthlyMetric.metric_type, params.metricType));
  }
  if (params?.from) {
    conditions.push(sql`${tradelineMonthlyMetric.period} >= ${params.from}`);
  }
  if (params?.to) {
    conditions.push(sql`${tradelineMonthlyMetric.period} <= ${params.to}`);
  }

  const rows = db
    .select({
      monthlyMetricId: tradelineMonthlyMetric.monthly_metric_id,
      period: tradelineMonthlyMetric.period,
      metricType: tradelineMonthlyMetric.metric_type,
      valueNumeric: tradelineMonthlyMetric.value_numeric,
      valueText: tradelineMonthlyMetric.value_text,
      canonicalStatus: tradelineMonthlyMetric.canonical_status,
    })
    .from(tradelineMonthlyMetric)
    .where(and(...conditions))
    .orderBy(tradelineMonthlyMetric.period)
    .all();

  return {
    tradelineId,
    metrics: rows.map((r) => ({
      monthlyMetricId: r.monthlyMetricId,
      period: r.period,
      metricType: r.metricType,
      valueNumeric: r.valueNumeric,
      valueText: r.valueText,
      canonicalStatus: r.canonicalStatus,
    })),
  };
}
