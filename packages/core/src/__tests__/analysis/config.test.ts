import { describe, it, expect } from 'vitest';
import { createTestDb } from '../helpers/test-db.js';
import { loadAnomalyConfig, DEFAULT_CONFIG } from '../../analysis/config.js';
import { updateAppSetting } from '../../queries/settings.js';

describe('Anomaly Config', () => {
  it('returns default config when no overrides exist', () => {
    const db = createTestDb();
    const config = loadAnomalyConfig(db as Parameters<typeof loadAnomalyConfig>[0]);

    expect(config).toEqual(DEFAULT_CONFIG);
  });

  it('overrides individual values from app_settings', () => {
    const db = createTestDb();

    updateAppSetting(db, 'anomaly.hard_search.burst_threshold', '5');
    updateAppSetting(db, 'anomaly.balance_change.pct_threshold', '50');

    const config = loadAnomalyConfig(db as Parameters<typeof loadAnomalyConfig>[0]);

    expect(config.hardSearch.burstThreshold).toBe(5);
    expect(config.balanceChange.pctThreshold).toBe(50);
    // Defaults retained for non-overridden values
    expect(config.hardSearch.burstWindowDays).toBe(DEFAULT_CONFIG.hardSearch.burstWindowDays);
    expect(config.hardSearch.frequentThreshold).toBe(DEFAULT_CONFIG.hardSearch.frequentThreshold);
  });

  it('ignores non-numeric setting values', () => {
    const db = createTestDb();

    updateAppSetting(db, 'anomaly.hard_search.burst_threshold', 'not_a_number');

    const config = loadAnomalyConfig(db as Parameters<typeof loadAnomalyConfig>[0]);

    expect(config.hardSearch.burstThreshold).toBe(DEFAULT_CONFIG.hardSearch.burstThreshold);
  });

  it('ignores unrelated app_settings keys', () => {
    const db = createTestDb();

    updateAppSetting(db, 'some_other.setting', '999');

    const config = loadAnomalyConfig(db as Parameters<typeof loadAnomalyConfig>[0]);

    expect(config).toEqual(DEFAULT_CONFIG);
  });

  it('all default config values are finite positive numbers', () => {
    const flatten = (obj: Record<string, unknown>, prefix = ''): [string, unknown][] => {
      const entries: [string, unknown][] = [];
      for (const [k, v] of Object.entries(obj)) {
        if (typeof v === 'object' && v !== null) {
          entries.push(...flatten(v as Record<string, unknown>, `${prefix}${k}.`));
        } else {
          entries.push([`${prefix}${k}`, v]);
        }
      }
      return entries;
    };

    for (const [, value] of flatten(DEFAULT_CONFIG as unknown as Record<string, unknown>)) {
      expect(typeof value).toBe('number');
      expect(Number.isFinite(value)).toBe(true);
      expect(value as number).toBeGreaterThan(0);
    }
  });
});
