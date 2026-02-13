<script lang="ts">
  import { SvelteMap } from 'svelte/reactivity';

  interface Metric {
    period: string;
    canonicalStatus: string | null;
    valueText: string | null;
  }

  interface Props {
    metrics: Metric[];
    class?: string;
  }

  let { metrics, class: className = '' }: Props = $props();

  type Severity = 'green' | 'amber' | 'red' | 'gray';

  const statusSeverity: Record<string, Severity> = {
    up_to_date: 'green',
    settled: 'green',
    arrangement: 'amber',
    query: 'amber',
    in_arrears: 'red',
    default: 'red',
    gone_away: 'red',
    written_off: 'red',
    repossession: 'red',
    inactive: 'gray',
    no_update: 'gray',
    transferred: 'gray',
    unknown: 'gray',
  };

  const severityColors: Record<Severity, string> = {
    green: 'bg-success',
    amber: 'bg-warning',
    red: 'bg-danger',
    gray: 'bg-soft',
  };

  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  interface Cell {
    status: string | null;
    valueText: string | null;
    severity: Severity;
  }

  const grid = $derived.by(() => {
    const byYear = new SvelteMap<number, SvelteMap<number, Cell>>();
    for (const m of metrics) {
      const [yearStr, monthStr] = m.period.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      if (isNaN(year) || isNaN(month)) continue;
      if (!byYear.has(year)) byYear.set(year, new SvelteMap());
      byYear.get(year)!.set(month, {
        status: m.canonicalStatus,
        valueText: m.valueText,
        severity: m.canonicalStatus ? (statusSeverity[m.canonicalStatus] ?? 'gray') : 'gray',
      });
    }
    const years = [...byYear.keys()].sort((a, b) => a - b);
    return { byYear, years };
  });
</script>

<div class="panel {className}">
  <h3 class="text-ink mb-4 text-lg font-semibold">Payment History</h3>
  {#if grid.years.length === 0}
    <p class="text-muted text-sm">No payment history data available.</p>
  {:else}
    <div class="overflow-x-auto">
      <table class="text-xs">
        <thead>
          <tr>
            <th class="text-muted pr-3 pb-1 text-left font-medium"></th>
            {#each months as month (month)}
              <th class="text-muted px-0.5 pb-1 text-center font-medium">{month}</th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each grid.years as year (year)}
            <tr>
              <td class="text-muted py-0.5 pr-3 font-mono">{year}</td>
              {#each { length: 12 } as _, i (i)}
                {@const cell = grid.byYear.get(year)?.get(i + 1)}
                <td class="px-0.5 py-0.5">
                  <div
                    class="h-6 w-6 rounded {cell ? severityColors[cell.severity] : 'bg-soft/50'}"
                    title={cell
                      ? `${year}-${String(i + 1).padStart(2, '0')}: ${cell.status ?? 'no data'}${cell.valueText ? ` (${cell.valueText})` : ''}`
                      : `${year}-${String(i + 1).padStart(2, '0')}: no data`}
                  ></div>
                </td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <div class="text-muted mt-3 flex flex-wrap gap-3 text-xs">
      <span class="flex items-center gap-1"
        ><span class="bg-success inline-block h-3 w-3 rounded"></span> Up to date</span
      >
      <span class="flex items-center gap-1"
        ><span class="bg-warning inline-block h-3 w-3 rounded"></span> Arrangement / Query</span
      >
      <span class="flex items-center gap-1"
        ><span class="bg-danger inline-block h-3 w-3 rounded"></span> Arrears / Default</span
      >
      <span class="flex items-center gap-1"
        ><span class="bg-soft inline-block h-3 w-3 rounded"></span> No data</span
      >
    </div>
  {/if}
</div>
