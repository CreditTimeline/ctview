export const insightSeverityConfig: Record<string, { borderClass: string; bgClass: string }> = {
  high: { borderClass: 'border-l-danger', bgClass: 'bg-danger-light' },
  medium: { borderClass: 'border-l-warning', bgClass: 'bg-warning-light' },
  low: { borderClass: 'border-l-info', bgClass: 'bg-info-light' },
  info: { borderClass: 'border-l-accent', bgClass: 'bg-accent-light' },
};

export function getSeverityClasses(severity: string | null): string {
  const cfg = insightSeverityConfig[severity ?? 'info'] ?? insightSeverityConfig.info;
  return `${cfg.borderClass} ${cfg.bgClass}`;
}
