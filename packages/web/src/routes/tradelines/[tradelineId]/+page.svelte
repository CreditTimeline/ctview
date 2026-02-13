<script lang="ts">
  import { SvelteMap } from 'svelte/reactivity';
  import type { ECOption } from '$lib/components/chart-types.js';
  import {
    StatCard,
    MoneyDisplay,
    DateDisplay,
    AgencyBadge,
    StatusBadge,
    AccountTypeBadge,
    EChart,
    PaymentHistoryGrid,
    EventTimeline,
  } from '$lib/components';

  let { data } = $props();

  const detail = $derived(data.detail);
  const metrics = $derived(data.metrics.metrics);

  // --- Helpers ---

  function formatPence(pence: number): string {
    const value = pence / 100;
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  const agencyColors: Record<string, string> = {
    equifax: '#e4002b',
    transunion: '#00a5e3',
    experian: '#1d4f91',
    other: '#78716c',
  };

  // --- Metric subsets ---

  const balanceMetrics = $derived(metrics.filter((m) => m.metricType === 'balance'));
  const creditLimitMetrics = $derived(metrics.filter((m) => m.metricType === 'credit_limit'));
  const paymentStatusMetrics = $derived(metrics.filter((m) => m.metricType === 'payment_status'));

  // --- KPI values ---

  const latestSnapshot = $derived(detail.snapshots[0] ?? null);
  const snapshotCount = $derived(detail.snapshots.length);

  // --- Balance Over Time Chart ---

  const balanceChartOption: ECOption = $derived.by(() => {
    const color = agencyColors[detail.sourceSystem] ?? agencyColors.other;
    return {
      tooltip: {
        trigger: 'axis',
        valueFormatter: (v: unknown) => (typeof v === 'number' ? formatPence(v) : String(v)),
      },
      grid: { left: 60, right: 20, top: 20, bottom: 30 },
      xAxis: { type: 'time' },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (v: number) => formatPence(v),
        },
      },
      series: [
        {
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 5,
          lineStyle: { width: 2, color },
          itemStyle: { color },
          areaStyle: { color, opacity: 0.08 },
          data: balanceMetrics
            .filter((m) => m.valueNumeric !== null)
            .map((m) => [m.period, m.valueNumeric]),
        },
      ],
    };
  });

  // --- Credit Limit Over Time Chart ---

  const creditLimitChartOption: ECOption = $derived.by(() => {
    return {
      tooltip: {
        trigger: 'axis',
        valueFormatter: (v: unknown) => (typeof v === 'number' ? formatPence(v) : String(v)),
      },
      grid: { left: 60, right: 20, top: 20, bottom: 30 },
      xAxis: { type: 'time' },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (v: number) => formatPence(v),
        },
      },
      series: [
        {
          type: 'line',
          step: 'end',
          symbol: 'circle',
          symbolSize: 5,
          lineStyle: { width: 2, color: '#0d9488' },
          itemStyle: { color: '#0d9488' },
          data: creditLimitMetrics
            .filter((m) => m.valueNumeric !== null)
            .map((m) => [m.period, m.valueNumeric]),
        },
      ],
    };
  });

  // --- Utilization Chart ---

  const utilizationData = $derived.by(() => {
    const balanceByPeriod = new SvelteMap<string, number>();
    for (const m of balanceMetrics) {
      if (m.valueNumeric !== null) balanceByPeriod.set(m.period, m.valueNumeric);
    }
    const limitByPeriod = new SvelteMap<string, number>();
    for (const m of creditLimitMetrics) {
      if (m.valueNumeric !== null) limitByPeriod.set(m.period, m.valueNumeric);
    }
    const points: { period: string; ratio: number }[] = [];
    for (const [period, balance] of balanceByPeriod) {
      const limit = limitByPeriod.get(period);
      if (limit && limit > 0) {
        points.push({ period, ratio: Math.round((balance / limit) * 100) });
      }
    }
    return points.sort((a, b) => a.period.localeCompare(b.period));
  });

  const utilizationChartOption: ECOption = $derived.by(() => {
    return {
      tooltip: {
        trigger: 'axis',
        valueFormatter: (v: unknown) => (typeof v === 'number' ? `${v}%` : String(v)),
      },
      grid: { left: 50, right: 20, top: 20, bottom: 30 },
      xAxis: { type: 'time' },
      yAxis: {
        type: 'value',
        max: 100,
        axisLabel: { formatter: '{value}%' },
      },
      series: [
        {
          type: 'bar',
          data: utilizationData.map((d) => ({
            value: [d.period, d.ratio],
            itemStyle: {
              color: d.ratio < 30 ? '#16a34a' : d.ratio <= 75 ? '#d97706' : '#dc2626',
            },
          })),
        },
      ],
    };
  });
</script>

<svelte:head>
  <title>{detail.furnisherName ?? 'Tradeline'} - CreditTimeline</title>
</svelte:head>

<div class="space-y-8">
  <!-- Breadcrumb -->
  <a href="/tradelines" class="text-accent inline-flex items-center gap-1 text-sm hover:underline">
    ← All Tradelines
  </a>

  <!-- Account Summary Card -->
  <div class="panel">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 class="text-ink text-2xl font-bold">
          {detail.furnisherName ?? detail.furnisherNameRaw ?? 'Unknown Furnisher'}
        </h2>
        <div class="mt-2 flex flex-wrap items-center gap-2">
          <AccountTypeBadge accountType={detail.accountType} />
          <StatusBadge status={detail.statusCurrent} />
          <AgencyBadge agency={detail.sourceSystem} size="md" />
        </div>
      </div>
    </div>

    <div class="mt-6 grid grid-cols-2 gap-x-8 gap-y-3 text-sm md:grid-cols-4">
      <div>
        <p class="text-muted">Opened</p>
        <p class="text-ink font-medium"><DateDisplay date={detail.openedAt} /></p>
      </div>
      <div>
        <p class="text-muted">Closed</p>
        <p class="text-ink font-medium"><DateDisplay date={detail.closedAt} /></p>
      </div>
      {#if detail.repaymentFrequency}
        <div>
          <p class="text-muted">Repayment Frequency</p>
          <p class="text-ink font-medium capitalize">
            {detail.repaymentFrequency.replace(/_/g, ' ')}
          </p>
        </div>
      {/if}
      {#if detail.regularPaymentAmount !== null}
        <div>
          <p class="text-muted">Regular Payment</p>
          <p class="text-ink font-medium"><MoneyDisplay amount={detail.regularPaymentAmount} /></p>
        </div>
      {/if}
    </div>

    {#if detail.identifiers.length > 0}
      <div class="border-soft mt-4 border-t pt-4">
        <p class="text-muted text-xs font-semibold tracking-wider uppercase">Identifiers</p>
        <div class="mt-2 flex flex-wrap gap-2">
          {#each detail.identifiers as id (id.identifierId)}
            <span class="badge bg-soft text-muted font-mono">{id.identifierType}: {id.value}</span>
          {/each}
        </div>
      </div>
    {/if}

    {#if detail.parties.length > 0}
      <div class="border-soft mt-4 border-t pt-4">
        <p class="text-muted text-xs font-semibold tracking-wider uppercase">Parties</p>
        <div class="mt-2 flex flex-wrap gap-3 text-sm">
          {#each detail.parties as party (party.partyId)}
            <span
              >{party.name ?? 'Unknown'}
              <span class="text-muted">({party.partyRole ?? 'unknown'})</span></span
            >
          {/each}
        </div>
      </div>
    {/if}

    {#if detail.terms.length > 0}
      <div class="border-soft mt-4 border-t pt-4">
        <p class="text-muted text-xs font-semibold tracking-wider uppercase">Terms</p>
        <div class="mt-2 space-y-2 text-sm">
          {#each detail.terms as term (term.termsId)}
            <div class="flex flex-wrap gap-4">
              {#if term.termType}<span class="text-muted">Type:</span>
                <span class="capitalize">{term.termType.replace(/_/g, ' ')}</span>{/if}
              {#if term.termCount !== null}<span class="text-muted">Length:</span>
                <span>{term.termCount} months</span>{/if}
              {#if term.termPaymentAmount !== null}<span class="text-muted">Payment:</span>
                <MoneyDisplay amount={term.termPaymentAmount} />{/if}
              {#if term.paymentStartDate}<span class="text-muted">Start:</span>
                <DateDisplay date={term.paymentStartDate} />{/if}
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>

  <!-- KPI Stats Row -->
  <section class="grid grid-cols-2 gap-6 lg:grid-cols-4">
    <StatCard
      label="Latest Balance"
      value={latestSnapshot?.currentBalance !== null && latestSnapshot?.currentBalance !== undefined
        ? formatPence(latestSnapshot.currentBalance)
        : '—'}
    />
    <StatCard
      label="Credit Limit"
      value={latestSnapshot?.creditLimit !== null && latestSnapshot?.creditLimit !== undefined
        ? formatPence(latestSnapshot.creditLimit)
        : '—'}
    />
    <StatCard
      label="Opening Balance"
      value={latestSnapshot?.openingBalance !== null && latestSnapshot?.openingBalance !== undefined
        ? formatPence(latestSnapshot.openingBalance)
        : '—'}
    />
    <StatCard label="Snapshots" value={snapshotCount} subtext="Historical data points" />
  </section>

  <!-- Balance Over Time Chart -->
  {#if balanceMetrics.length > 0}
    <section class="panel">
      <h3 class="text-ink mb-4 text-lg font-semibold">Balance Over Time</h3>
      <EChart option={balanceChartOption} height="300px" class="w-full" />
    </section>
  {/if}

  <!-- Credit Limit Over Time Chart -->
  {#if creditLimitMetrics.length > 0}
    <section class="panel">
      <h3 class="text-ink mb-4 text-lg font-semibold">Credit Limit Over Time</h3>
      <EChart option={creditLimitChartOption} height="300px" class="w-full" />
    </section>
  {/if}

  <!-- Utilization Ratio Chart -->
  {#if utilizationData.length > 0}
    <section class="panel">
      <h3 class="text-ink mb-4 text-lg font-semibold">Utilization Ratio</h3>
      <EChart option={utilizationChartOption} height="300px" class="w-full" />
    </section>
  {/if}

  <!-- Payment History Grid -->
  {#if paymentStatusMetrics.length > 0}
    <PaymentHistoryGrid metrics={paymentStatusMetrics} />
  {/if}

  <!-- Snapshot Comparison Table -->
  {#if detail.snapshots.length > 0}
    <section class="panel">
      <h3 class="text-ink mb-4 text-lg font-semibold">Snapshot History</h3>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead>
            <tr class="border-soft border-b">
              <th class="text-muted px-3 py-3 text-xs font-semibold tracking-wider uppercase"
                >Date</th
              >
              <th class="text-muted px-3 py-3 text-xs font-semibold tracking-wider uppercase"
                >Status</th
              >
              <th class="text-muted px-3 py-3 text-xs font-semibold tracking-wider uppercase"
                >Balance</th
              >
              <th class="text-muted px-3 py-3 text-xs font-semibold tracking-wider uppercase"
                >Credit Limit</th
              >
              <th class="text-muted px-3 py-3 text-xs font-semibold tracking-wider uppercase"
                >Opening Balance</th
              >
              <th class="text-muted px-3 py-3 text-xs font-semibold tracking-wider uppercase"
                >Delinquent</th
              >
              <th class="text-muted px-3 py-3 text-xs font-semibold tracking-wider uppercase"
                >Payment</th
              >
            </tr>
          </thead>
          <tbody>
            {#each detail.snapshots as snap (snap.snapshotId)}
              <tr class="border-soft/50 hover:bg-canvas border-b transition-colors">
                <td class="px-3 py-3"><DateDisplay date={snap.asOfDate} /></td>
                <td class="px-3 py-3"><StatusBadge status={snap.statusCurrent} /></td>
                <td class="px-3 py-3"><MoneyDisplay amount={snap.currentBalance} /></td>
                <td class="px-3 py-3"><MoneyDisplay amount={snap.creditLimit} /></td>
                <td class="px-3 py-3"><MoneyDisplay amount={snap.openingBalance} /></td>
                <td class="px-3 py-3"><MoneyDisplay amount={snap.delinquentBalance} /></td>
                <td class="px-3 py-3"><MoneyDisplay amount={snap.paymentAmount} /></td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>
  {/if}

  <!-- Event Timeline -->
  {#if detail.events.length > 0}
    <section>
      <h3 class="text-ink mb-4 text-lg font-semibold">Events</h3>
      <EventTimeline events={detail.events} />
    </section>
  {/if}

  <!-- Cross-Agency Comparison -->
  {#if detail.crossAgencyPeers.length > 0}
    <section>
      <h3 class="text-ink mb-4 text-lg font-semibold">Cross-Agency Comparison</h3>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {#each detail.crossAgencyPeers as peer (peer.tradelineId)}
          <a
            href="/tradelines/{peer.tradelineId}"
            class="panel hover:bg-canvas flex items-center gap-3 transition-colors"
          >
            <AgencyBadge agency={peer.sourceSystem} size="md" />
            <span class="text-ink font-medium">{peer.furnisherName ?? 'Unknown'}</span>
          </a>
        {/each}
      </div>
    </section>
  {/if}
</div>
