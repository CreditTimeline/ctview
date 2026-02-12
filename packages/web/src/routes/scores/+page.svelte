<script lang="ts">
  import type { ScoreEntry, ScoreTrendPoint } from '@ctview/core';
  import type { ColumnDef } from '@tanstack/svelte-table';
  import { renderComponent } from '@tanstack/svelte-table';
  import type { ECOption } from '$lib/components/chart-types.js';
  import {
    DataTable,
    AgencyBadge,
    DateDisplay,
    EChart,
    ScoreGauge,
    Pagination,
  } from '$lib/components';

  let { data } = $props();

  const agencyColors: Record<string, string> = {
    equifax: '#e4002b',
    transunion: '#00a5e3',
    experian: '#1d4f91',
    other: '#78716c',
  };

  const agencyLabels: Record<string, string> = {
    equifax: 'Equifax',
    transunion: 'TransUnion',
    experian: 'Experian',
    other: 'Other',
  };

  const hasTrend = $derived(Object.keys(data.scoreTrend.series).length > 0);

  const trendOption: ECOption = $derived.by(() => {
    const series = data.scoreTrend.series;
    return {
      tooltip: { trigger: 'axis' },
      legend: { data: Object.keys(series).map((s) => agencyLabels[s] ?? s), bottom: 0 },
      grid: { left: 50, right: 20, top: 20, bottom: 40 },
      xAxis: { type: 'time' },
      yAxis: { type: 'value', name: 'Score' },
      series: Object.entries(series).map(([source, points]) => ({
        name: agencyLabels[source] ?? source,
        type: 'line' as const,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 2, color: agencyColors[source] ?? agencyColors.other },
        itemStyle: { color: agencyColors[source] ?? agencyColors.other },
        data: (points as ScoreTrendPoint[])
          .filter((p) => p.calculatedAt && p.scoreValue !== null)
          .map((p) => [p.calculatedAt, p.scoreValue]),
      })),
    };
  });

  const columns: ColumnDef<ScoreEntry, any>[] = [
    {
      accessorKey: 'calculatedAt',
      header: 'Date',
      cell: ({ row }) =>
        renderComponent(DateDisplay, { date: row.original.calculatedAt }),
    },
    {
      accessorKey: 'sourceSystem',
      header: 'Agency',
      cell: ({ row }) =>
        renderComponent(AgencyBadge, { agency: row.original.sourceSystem }),
    },
    {
      accessorKey: 'scoreValue',
      header: 'Score',
      cell: ({ row }) => {
        const v = row.original.scoreValue;
        return v !== null ? String(v) : '\u2014';
      },
    },
    {
      accessorKey: 'scoreBand',
      header: 'Band',
      cell: ({ row }) => row.original.scoreBand ?? '\u2014',
    },
    {
      accessorKey: 'scoreName',
      header: 'Type',
      cell: ({ row }) => row.original.scoreName ?? '\u2014',
    },
    {
      accessorKey: 'scoreFactors',
      header: 'Factors',
      cell: ({ row }) => row.original.scoreFactors.join(', ') || '\u2014',
    },
  ];
</script>

<svelte:head><title>Credit Scores - CreditTimeline</title></svelte:head>

<div class="space-y-8">
  <div>
    <h2 class="text-2xl font-bold text-ink">Credit Scores</h2>
    <p class="mt-1 text-muted">Score history and trends across agencies.</p>
  </div>

  <!-- Filter bar -->
  <div class="flex flex-wrap items-center gap-4">
    <form method="get" class="flex items-center gap-3">
      <label for="sourceSystem" class="text-sm font-medium text-muted">Agency</label>
      <select
        id="sourceSystem"
        name="sourceSystem"
        class="rounded-lg border border-soft bg-surface px-3 py-2 text-sm text-ink"
        value={data.filters.sourceSystem}
        onchange={(e) => e.currentTarget.form?.submit()}
      >
        <option value="">All agencies</option>
        <option value="equifax">Equifax</option>
        <option value="transunion">TransUnion</option>
        <option value="experian">Experian</option>
      </select>
    </form>
    <span class="text-sm text-muted">{data.total} result{data.total !== 1 ? 's' : ''}</span>
  </div>

  <!-- Latest Score Gauges -->
  {#if data.latestScores.length > 0}
    <section>
      <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {#each data.latestScores as score (score.scoreId)}
          <ScoreGauge {score} />
        {/each}
      </div>
    </section>
  {/if}

  <!-- Score Trend Chart -->
  {#if hasTrend}
    <section class="panel">
      <h3 class="mb-4 text-lg font-semibold text-ink">Score Trend</h3>
      <EChart option={trendOption} height="320px" />
    </section>
  {/if}

  <!-- Score History Table -->
  {#if data.items.length > 0}
    <section>
      <h3 class="mb-4 text-lg font-semibold text-ink">Score History</h3>
      <DataTable data={data.items} {columns} />
    </section>

    <Pagination total={data.total} limit={data.limit} offset={data.offset} baseUrl="/scores" />
  {:else}
    <div class="panel text-center">
      <p class="text-muted">No credit scores found matching your filters.</p>
    </div>
  {/if}
</div>
