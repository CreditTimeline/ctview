<script lang="ts">
  interface Props {
    status: string | null;
    class?: string;
  }

  let { status, class: className = '' }: Props = $props();

  type Severity = 'good' | 'neutral' | 'warning' | 'danger';

  const statusConfig: Record<string, { label: string; severity: Severity }> = {
    up_to_date: { label: 'Up to Date', severity: 'good' },
    settled: { label: 'Settled', severity: 'good' },
    inactive: { label: 'Inactive', severity: 'neutral' },
    no_update: { label: 'No Update', severity: 'neutral' },
    transferred: { label: 'Transferred', severity: 'neutral' },
    unknown: { label: 'Unknown', severity: 'neutral' },
    query: { label: 'Query', severity: 'warning' },
    arrangement: { label: 'Arrangement', severity: 'warning' },
    in_arrears: { label: 'In Arrears', severity: 'danger' },
    default: { label: 'Default', severity: 'danger' },
    gone_away: { label: 'Gone Away', severity: 'danger' },
    written_off: { label: 'Written Off', severity: 'danger' },
    repossession: { label: 'Repossession', severity: 'danger' },
  };

  const severityColors: Record<Severity, string> = {
    good: 'bg-success-light text-success',
    neutral: 'bg-soft text-muted',
    warning: 'bg-warning-light text-warning',
    danger: 'bg-danger-light text-danger',
  };

  const resolved = $derived.by(() => {
    const cfg = status ? statusConfig[status] : null;
    const label = cfg?.label ?? status ?? 'Unknown';
    const severity = cfg?.severity ?? 'neutral';
    return { label, colorClass: severityColors[severity] };
  });
</script>

<span class="badge {resolved.colorClass} {className}">
  {resolved.label}
</span>
