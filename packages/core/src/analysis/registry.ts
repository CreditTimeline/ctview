import type { AnomalyRule } from './types.js';
import { hardSearchDetection } from './rules/hard-search-detection.js';
import { paymentStatusDegradation } from './rules/payment-status-degradation.js';
import { balanceChangeDetection } from './rules/balance-change-detection.js';
import { newTradelineDetection } from './rules/new-tradeline-detection.js';
import { statusChangeDetection } from './rules/status-change-detection.js';
import { crossAgencyDiscrepancy } from './rules/cross-agency-discrepancy.js';

export const defaultRules: AnomalyRule[] = [
  newTradelineDetection,
  balanceChangeDetection,
  paymentStatusDegradation,
  statusChangeDetection,
  hardSearchDetection,
  crossAgencyDiscrepancy,
];
