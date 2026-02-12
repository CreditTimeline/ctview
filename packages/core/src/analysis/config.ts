import { like } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type * as schema from '../schema/sqlite/index.js';
import type * as relations from '../schema/relations.js';
import { appSettings } from '../schema/sqlite/app.js';

export interface AnomalyConfig {
  hardSearch: {
    burstWindowDays: number;
    burstThreshold: number;
    frequentThreshold: number;
  };
  balanceChange: {
    pctThreshold: number;
    absMinimum: number;
  };
  scoreChange: {
    threshold: number;
  };
  crossAgency: {
    balancePctThreshold: number;
    limitPctThreshold: number;
  };
}

const DEFAULT_CONFIG: AnomalyConfig = {
  hardSearch: {
    burstWindowDays: 30,
    burstThreshold: 3,
    frequentThreshold: 2,
  },
  balanceChange: {
    pctThreshold: 25,
    absMinimum: 10000,
  },
  scoreChange: {
    threshold: 50,
  },
  crossAgency: {
    balancePctThreshold: 10,
    limitPctThreshold: 10,
  },
};

type DB = BetterSQLite3Database<typeof schema & typeof relations>;

export function loadAnomalyConfig(db: DB): AnomalyConfig {
  const rows = db
    .select({ key: appSettings.key, value: appSettings.value })
    .from(appSettings)
    .where(like(appSettings.key, 'anomaly.%'))
    .all();

  const overrides = new Map<string, string>();
  for (const r of rows) {
    overrides.set(r.key, r.value);
  }

  const num = (key: string, fallback: number): number => {
    const v = overrides.get(key);
    if (v === undefined) return fallback;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };

  return {
    hardSearch: {
      burstWindowDays: num('anomaly.hard_search.burst_window_days', DEFAULT_CONFIG.hardSearch.burstWindowDays),
      burstThreshold: num('anomaly.hard_search.burst_threshold', DEFAULT_CONFIG.hardSearch.burstThreshold),
      frequentThreshold: num('anomaly.hard_search.frequent_threshold', DEFAULT_CONFIG.hardSearch.frequentThreshold),
    },
    balanceChange: {
      pctThreshold: num('anomaly.balance_change.pct_threshold', DEFAULT_CONFIG.balanceChange.pctThreshold),
      absMinimum: num('anomaly.balance_change.abs_minimum', DEFAULT_CONFIG.balanceChange.absMinimum),
    },
    scoreChange: {
      threshold: num('anomaly.score_change.threshold', DEFAULT_CONFIG.scoreChange.threshold),
    },
    crossAgency: {
      balancePctThreshold: num('anomaly.cross_agency.balance_pct_threshold', DEFAULT_CONFIG.crossAgency.balancePctThreshold),
      limitPctThreshold: num('anomaly.cross_agency.limit_pct_threshold', DEFAULT_CONFIG.crossAgency.limitPctThreshold),
    },
  };
}

export { DEFAULT_CONFIG };
