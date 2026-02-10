/**
 * Derives a deterministic metric_value_key for tradeline_monthly_metric rows.
 * Per normalization-rules.v1.json:
 * - For payment_status: use raw_status_code (fallback canonical_status, then value_text)
 * - For numeric metrics: use value_numeric as a canonical string
 * - Otherwise: use value_text
 * - Prefix with metric_type and normalize whitespace
 */
export function deriveMetricValueKey(metric: {
  metric_type: string;
  raw_status_code?: string;
  canonical_status?: string;
  value_text?: string;
  value_numeric?: number;
}): string {
  let valuePart: string;

  if (metric.metric_type === 'payment_status') {
    valuePart = metric.raw_status_code ?? metric.canonical_status ?? metric.value_text ?? 'unknown';
  } else if (metric.value_numeric !== undefined && metric.value_numeric !== null) {
    valuePart = String(metric.value_numeric);
  } else {
    valuePart = metric.value_text ?? 'unknown';
  }

  return `${metric.metric_type}:${valuePart.trim()}`;
}
