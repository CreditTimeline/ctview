<script lang="ts">
  interface Props {
    accountType: string | null;
    class?: string;
  }

  let { accountType, class: className = '' }: Props = $props();

  type ColorScheme = 'info' | 'accent' | 'warning' | 'success' | 'neutral' | 'ember';

  const typeConfig: Record<string, { label: string; color: ColorScheme }> = {
    credit_card: { label: 'Credit Card', color: 'info' },
    mortgage: { label: 'Mortgage', color: 'accent' },
    secured_loan: { label: 'Secured Loan', color: 'accent' },
    unsecured_loan: { label: 'Unsecured Loan', color: 'warning' },
    current_account: { label: 'Current Account', color: 'success' },
    telecom: { label: 'Telecom', color: 'neutral' },
    utility: { label: 'Utility', color: 'neutral' },
    budget_account: { label: 'Budget Account', color: 'neutral' },
    insurance: { label: 'Insurance', color: 'neutral' },
    other: { label: 'Other', color: 'neutral' },
    unknown: { label: 'Unknown', color: 'neutral' },
    rental: { label: 'Rental', color: 'ember' },
  };

  const colorClasses: Record<ColorScheme, string> = {
    info: 'bg-info-light text-info',
    accent: 'bg-accent-light text-accent-dark',
    warning: 'bg-warning-light text-warning',
    success: 'bg-success-light text-success',
    neutral: 'bg-soft text-muted',
    ember: 'bg-ember-light text-ember-dark',
  };

  const resolved = $derived.by(() => {
    const cfg = accountType ? typeConfig[accountType] : null;
    const label = cfg?.label ?? accountType ?? 'Unknown';
    const color = cfg?.color ?? 'neutral';
    return { label, colorClass: colorClasses[color] };
  });
</script>

<span class="badge {resolved.colorClass} {className}">
  {resolved.label}
</span>
