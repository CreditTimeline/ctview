import { sql } from 'drizzle-orm';
import type { AppDatabase } from '../db/client.js';

// ---------------------------------------------------------------------------
// Credit Utilization Trend
// ---------------------------------------------------------------------------

export interface UtilizationTrendPoint {
  date: string;
  totalBalance: number;
  totalLimit: number;
  utilizationPct: number;
}

export interface UtilizationTrendData {
  points: UtilizationTrendPoint[];
}

export function getCreditUtilizationTrend(
  db: AppDatabase,
  subjectId: string,
): UtilizationTrendData {
  interface Row {
    as_of_date: string;
    total_balance: number;
    total_limit: number;
  }

  const rows = db.all<Row>(sql`
    SELECT ts.as_of_date,
           SUM(ts.current_balance) AS total_balance,
           SUM(ts.credit_limit) AS total_limit
    FROM tradeline_snapshot ts
    JOIN tradeline t ON ts.tradeline_id = t.tradeline_id
    WHERE t.subject_id = ${subjectId}
      AND ts.credit_limit > 0
      AND ts.current_balance IS NOT NULL
    GROUP BY ts.as_of_date
    ORDER BY ts.as_of_date ASC
  `);

  const points: UtilizationTrendPoint[] = rows.map((r) => ({
    date: r.as_of_date,
    totalBalance: r.total_balance,
    totalLimit: r.total_limit,
    utilizationPct:
      r.total_limit > 0
        ? Math.round((r.total_balance / r.total_limit) * 10000) / 100
        : 0,
  }));

  return { points };
}

// ---------------------------------------------------------------------------
// Score-Event Correlation
// ---------------------------------------------------------------------------

export interface ScoreCorrelationPoint {
  scoreId: string;
  scoreValue: number;
  calculatedAt: string;
}

export interface CorrelationEvent {
  eventId: string;
  eventType: string;
  eventDate: string;
  tradelineId: string;
  furnisherName: string | null;
}

export interface ScoreEventCorrelationData {
  scoreSeries: Record<string, ScoreCorrelationPoint[]>;
  events: CorrelationEvent[];
}

export function getScoreEventCorrelation(
  db: AppDatabase,
  subjectId: string,
): ScoreEventCorrelationData {
  interface ScoreRow {
    score_id: string;
    score_value: number;
    calculated_at: string;
    source_system: string;
  }

  const scoreRows = db.all<ScoreRow>(sql`
    SELECT score_id, score_value, calculated_at, source_system
    FROM credit_score
    WHERE subject_id = ${subjectId}
      AND score_value IS NOT NULL
    ORDER BY source_system, calculated_at ASC
  `);

  const scoreSeries: Record<string, ScoreCorrelationPoint[]> = {};
  for (const r of scoreRows) {
    if (!scoreSeries[r.source_system]) scoreSeries[r.source_system] = [];
    scoreSeries[r.source_system]!.push({
      scoreId: r.score_id,
      scoreValue: r.score_value,
      calculatedAt: r.calculated_at,
    });
  }

  interface EventRow {
    event_id: string;
    event_type: string;
    event_date: string;
    tradeline_id: string;
    furnisher_name: string | null;
  }

  const eventRows = db.all<EventRow>(sql`
    SELECT te.event_id, te.event_type, te.event_date, te.tradeline_id,
           COALESCE(o.name, t.furnisher_name_raw) AS furnisher_name
    FROM tradeline_event te
    JOIN tradeline t ON te.tradeline_id = t.tradeline_id
    LEFT JOIN organisation o ON t.furnisher_organisation_id = o.organisation_id
    WHERE t.subject_id = ${subjectId}
    ORDER BY te.event_date ASC
  `);

  const events: CorrelationEvent[] = eventRows.map((r) => ({
    eventId: r.event_id,
    eventType: r.event_type,
    eventDate: r.event_date,
    tradelineId: r.tradeline_id,
    furnisherName: r.furnisher_name,
  }));

  return { scoreSeries, events };
}

// ---------------------------------------------------------------------------
// Payment Pattern Analysis
// ---------------------------------------------------------------------------

export interface PaymentPeriod {
  period: string;
  onTimeCount: number;
  lateCount: number;
  totalAccounts: number;
}

export interface PaymentPatternData {
  periods: PaymentPeriod[];
}

export function getPaymentPatternAnalysis(
  db: AppDatabase,
  subjectId: string,
): PaymentPatternData {
  interface Row {
    period: string;
    canonical_status: string | null;
    cnt: number;
  }

  const rows = db.all<Row>(sql`
    SELECT mm.period, mm.canonical_status, COUNT(*) AS cnt
    FROM tradeline_monthly_metric mm
    JOIN tradeline t ON mm.tradeline_id = t.tradeline_id
    WHERE t.subject_id = ${subjectId}
      AND mm.metric_type = 'payment_status'
      AND mm.canonical_status IS NOT NULL
    GROUP BY mm.period, mm.canonical_status
    ORDER BY mm.period ASC
  `);

  const ON_TIME_STATUSES = new Set(['up_to_date', 'no_update', 'inactive']);

  const periodMap = new Map<string, { onTime: number; late: number }>();
  for (const r of rows) {
    const entry = periodMap.get(r.period) ?? { onTime: 0, late: 0 };
    if (ON_TIME_STATUSES.has(r.canonical_status ?? '')) {
      entry.onTime += r.cnt;
    } else {
      entry.late += r.cnt;
    }
    periodMap.set(r.period, entry);
  }

  const periods: PaymentPeriod[] = [];
  for (const [period, { onTime, late }] of periodMap) {
    periods.push({
      period,
      onTimeCount: onTime,
      lateCount: late,
      totalAccounts: onTime + late,
    });
  }

  return { periods };
}
