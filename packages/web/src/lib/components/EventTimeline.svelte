<script lang="ts">
  import { DateDisplay, MoneyDisplay } from '$lib/components';

  interface Event {
    eventId: string;
    eventType: string;
    eventDate: string;
    amount: number | null;
    notes: string | null;
  }

  interface Props {
    events: Event[];
    class?: string;
  }

  let { events, class: className = '' }: Props = $props();

  type Severity = 'good' | 'warning' | 'danger' | 'neutral';

  const eventSeverity: Record<string, Severity> = {
    delinquency: 'danger',
    default: 'danger',
    repossession: 'danger',
    write_off: 'danger',
    gone_away: 'danger',
    arrangement_to_pay: 'warning',
    partial_payment: 'warning',
    late_payment: 'warning',
    satisfied: 'good',
    settled: 'good',
    account_opened: 'neutral',
    account_closed: 'neutral',
    balance_change: 'neutral',
    limit_change: 'neutral',
    status_change: 'neutral',
  };

  const severityBorderColors: Record<Severity, string> = {
    good: 'border-success',
    warning: 'border-warning',
    danger: 'border-danger',
    neutral: 'border-soft',
  };

  const severityBadgeColors: Record<Severity, string> = {
    good: 'bg-success-light text-success',
    warning: 'bg-warning-light text-warning',
    danger: 'bg-danger-light text-danger',
    neutral: 'bg-soft text-muted',
  };

  function formatEventType(type: string): string {
    return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
</script>

<div class={className}>
  {#if events.length === 0}
    <p class="text-muted text-sm">No events recorded.</p>
  {:else}
    <div class="space-y-3">
      {#each events as event (event.eventId)}
        {@const severity = eventSeverity[event.eventType] ?? 'neutral'}
        <div class="bg-surface rounded-lg border-l-4 p-4 {severityBorderColors[severity]}">
          <div class="flex items-center gap-2">
            <span class="badge {severityBadgeColors[severity]}"
              >{formatEventType(event.eventType)}</span
            >
            <DateDisplay date={event.eventDate} class="text-muted text-sm" />
            {#if event.amount !== null}
              <MoneyDisplay amount={event.amount} class="text-sm" />
            {/if}
          </div>
          {#if event.notes}
            <p class="text-muted mt-2 text-sm">{event.notes}</p>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>
