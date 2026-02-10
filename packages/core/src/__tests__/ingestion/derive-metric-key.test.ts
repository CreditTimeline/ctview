import { describe, it, expect } from 'vitest';
import { deriveMetricValueKey } from '../../ingestion/derive-metric-key.js';

describe('deriveMetricValueKey', () => {
  it('uses raw_status_code for payment_status metrics', () => {
    const key = deriveMetricValueKey({
      metric_type: 'payment_status',
      raw_status_code: '0',
      canonical_status: 'up_to_date',
      value_text: 'ok',
    });
    expect(key).toBe('payment_status:0');
  });

  it('falls back to canonical_status when raw_status_code is missing', () => {
    const key = deriveMetricValueKey({
      metric_type: 'payment_status',
      canonical_status: 'up_to_date',
    });
    expect(key).toBe('payment_status:up_to_date');
  });

  it('falls back to value_text when both status codes are missing', () => {
    const key = deriveMetricValueKey({
      metric_type: 'payment_status',
      value_text: 'current',
    });
    expect(key).toBe('payment_status:current');
  });

  it('falls back to unknown when all status fields are missing', () => {
    const key = deriveMetricValueKey({
      metric_type: 'payment_status',
    });
    expect(key).toBe('payment_status:unknown');
  });

  it('uses value_numeric for numeric metrics', () => {
    const key = deriveMetricValueKey({
      metric_type: 'balance',
      value_numeric: 50000,
    });
    expect(key).toBe('balance:50000');
  });

  it('uses value_text for text metrics without value_numeric', () => {
    const key = deriveMetricValueKey({
      metric_type: 'account_status',
      value_text: 'open',
    });
    expect(key).toBe('account_status:open');
  });

  it('prefers value_numeric over value_text for non-payment_status', () => {
    const key = deriveMetricValueKey({
      metric_type: 'balance',
      value_numeric: 100,
      value_text: 'one hundred',
    });
    expect(key).toBe('balance:100');
  });

  it('trims whitespace from value part', () => {
    const key = deriveMetricValueKey({
      metric_type: 'payment_status',
      raw_status_code: '  0  ',
    });
    expect(key).toBe('payment_status:0');
  });

  it('handles zero value_numeric correctly', () => {
    const key = deriveMetricValueKey({
      metric_type: 'balance',
      value_numeric: 0,
    });
    expect(key).toBe('balance:0');
  });
});
