<script lang="ts">
  import type { ScoreTrendPoint } from '@ctview/core';
  import type { ECOption } from '$lib/components/chart-types.js';
  import {
    StatCard,
    DateDisplay,
    AgencyBadge,
    EChart,
    ScoreGauge,
    getSeverityClasses,
  } from '$lib/components';

  let { data } = $props();

  // --- Derived state ---

  const hasScores = $derived(data.latestScores.length > 0);
  const hasTrend = $derived(Object.keys(data.scoreTrend.series).length > 0);
  const hasImports = $derived(data.recentImports.length > 0);
  const hasInsights = $derived(data.recentInsights.length > 0);

  const utilization = $derived.by(() => {
    if (!data.debtSummary.totalCreditLimit) return null;
    return Math.round((data.debtSummary.totalBalance / data.debtSummary.totalCreditLimit) * 100);
  });

  const utilizationColor = $derived.by(() => {
    if (utilization === null) return 'text-muted';
    if (utilization < 30) return 'text-success';
    if (utilization <= 75) return 'text-warning';
    return 'text-danger';
  });

  // --- Format money for StatCard value prop ---

  function formatPence(pence: number): string {
    const value = pence / 100;
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  // --- Score trend chart config ---

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

  const trendOption: ECOption = $derived.by(() => {
    const series = data.scoreTrend.series;
    return {
      tooltip: {
        trigger: 'axis',
      },
      legend: {
        data: Object.keys(series).map((s) => agencyLabels[s] ?? s),
        bottom: 0,
      },
      grid: { left: 50, right: 20, top: 20, bottom: 40 },
      xAxis: {
        type: 'time',
      },
      yAxis: {
        type: 'value',
        name: 'Score',
      },
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
</script>

<svelte:head>
  <title>Dashboard - CreditTimeline</title>
</svelte:head>

<div class="space-y-8">
  <div>
    <h2 class="text-ink text-2xl font-bold">Dashboard</h2>
    <p class="text-muted mt-1">Overview of your credit file data.</p>
  </div>

  {#if data.counts.imports === 0}
    <!-- Empty state -->
    <div class="border-accent/30 bg-accent-light rounded-xl border p-8 text-center">
      <h3 class="text-accent-dark text-lg font-semibold">No data yet</h3>
      <p class="text-accent-dark/80 mt-2">
        Import your first credit report by sending a POST request to
        <code class="bg-accent/10 rounded px-2 py-0.5 font-mono text-sm">/api/v1/ingest</code>
      </p>
    </div>
  {:else}
    <!-- Credit Score Gauges -->
    {#if hasScores}
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
        <h3 class="text-ink mb-4 text-lg font-semibold">Score Trend</h3>
        <EChart option={trendOption} height="350px" class="w-full" />
      </section>
    {/if}

    <!-- Debt Summary Cards -->
    <section>
      <div class="grid grid-cols-2 gap-6 lg:grid-cols-4">
        <StatCard
          label="Total Balance"
          value={formatPence(data.debtSummary.totalBalance)}
          subtext="Across open accounts"
        />
        <StatCard
          label="Credit Limit"
          value={formatPence(data.debtSummary.totalCreditLimit)}
          subtext="Total available credit"
        />
        <StatCard label="Open Accounts" value={data.debtSummary.openTradelineCount} />
        <div class="panel">
          <p class="text-muted text-sm font-medium">Utilization</p>
          <p class="mt-2 text-3xl font-bold {utilizationColor}">
            {utilization !== null ? `${utilization}%` : 'N/A'}
          </p>
          {#if utilization !== null}
            <p class="text-muted mt-1 text-sm">Balance / limit ratio</p>
          {/if}
        </div>
      </div>
    </section>

    <!-- Recent Imports + Alerts -->
    <section class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <!-- Recent Imports Timeline -->
      <div class="panel">
        <h3 class="text-ink text-lg font-semibold">Recent Imports</h3>
        {#if hasImports}
          <div class="mt-4 space-y-4">
            {#each data.recentImports as imp (imp.importId)}
              <div class="border-accent flex items-start gap-3 border-l-2 pl-4">
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <AgencyBadge agency={imp.sourceSystem} />
                    <DateDisplay date={imp.importedAt} relative />
                  </div>
                  <p class="text-muted mt-1 text-sm">
                    {imp.acquisitionMethod}
                    {#if imp.entityCounts}
                      — {Object.values(imp.entityCounts).reduce((a, b) => a + b, 0)} entities
                    {/if}
                  </p>
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <p class="text-muted mt-4 text-sm">No imports yet.</p>
        {/if}
      </div>

      <!-- Alerts & Insights -->
      <div class="panel">
        <h3 class="text-ink text-lg font-semibold">Alerts &amp; Insights</h3>
        {#if hasInsights}
          <div class="mt-4 space-y-3">
            {#each data.recentInsights as insight (insight.insightId)}
              <div class="rounded-lg border-l-4 p-3 {getSeverityClasses(insight.severity)}">
                <p class="text-ink text-sm font-medium">
                  {insight.summary ?? insight.kind}
                </p>
                <div class="text-muted mt-1 flex items-center gap-2 text-xs">
                  <DateDisplay date={insight.generatedAt} relative />
                  <span class="badge bg-soft text-muted">{insight.kind}</span>
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <p class="text-muted mt-4 text-sm">No insights generated yet.</p>
        {/if}
      </div>
    </section>

    <!-- Entity counts summary -->
    <section>
      <div class="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
        <StatCard label="Tradelines" value={data.counts.tradelines} />
        <StatCard label="Searches" value={data.counts.searches} />
        <StatCard label="Addresses" value={data.counts.addresses} />
        <StatCard label="Public Records" value={data.counts.publicRecords} />
        <StatCard label="Insights" value={data.counts.insights} />
      </div>
    </section>
  {/if}
</div>
