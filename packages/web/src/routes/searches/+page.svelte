<script lang="ts">
  import type { SearchSummary } from '@ctview/core';
  import type { ColumnDef } from '@tanstack/svelte-table';
  import { renderComponent } from '@tanstack/svelte-table';
  import type { ECOption } from '$lib/components/chart-types.js';
  import { DataTable, DateDisplay, StatCard, EChart, Pagination } from '$lib/components';
  import VisibilityBadge from '$lib/components/VisibilityBadge.svelte';

  let { data } = $props();

  let globalFilter = $state('');

  // --- Derived KPI counts ---

  const hardCount = $derived(data.items.filter((s) => s.visibility === 'hard').length);
  const softCount = $derived(data.items.filter((s) => s.visibility === 'soft').length);

  // --- Search Timeline Chart ---

  const timelineOption: ECOption = $derived.by(() => {
    const hardMap = new Map(data.timeline.hardSearches.map((b) => [b.month, b.count]));
    const softMap = new Map(data.timeline.softSearches.map((b) => [b.month, b.count]));
    const allMonths = [
      ...new Set([...hardMap.keys(), ...softMap.keys()]),
    ].sort();

    return {
      tooltip: { trigger: 'axis' },
      legend: { data: ['Hard', 'Soft'], bottom: 0 },
      grid: { left: 50, right: 20, top: 20, bottom: 40 },
      xAxis: { type: 'category', data: allMonths },
      yAxis: { type: 'value', name: 'Searches' },
      series: [
        {
          name: 'Hard',
          type: 'bar' as const,
          stack: 'total',
          color: '#dc2626',
          data: allMonths.map((m) => hardMap.get(m) ?? 0),
        },
        {
          name: 'Soft',
          type: 'bar' as const,
          stack: 'total',
          color: '#2563eb',
          data: allMonths.map((m) => softMap.get(m) ?? 0),
        },
      ],
    };
  });

  const hasTimeline = $derived(
    data.timeline.hardSearches.length > 0 || data.timeline.softSearches.length > 0,
  );

  // --- Organisation Breakdown Chart ---

  const frequencyOption: ECOption = $derived.by(() => {
    const orgNames = data.frequency.items.map((i) => i.organisationName ?? 'Unknown');
    const orgCounts = data.frequency.items.map((i) => i.count);
    return {
      tooltip: { trigger: 'axis' },
      grid: { left: 150, right: 20, top: 10, bottom: 20 },
      xAxis: { type: 'value' },
      yAxis: { type: 'category', data: orgNames, inverse: true },
      series: [{ type: 'bar' as const, data: orgCounts, color: '#0d9488' }],
    };
  });

  const hasFrequency = $derived(data.frequency.items.length > 0);

  // --- Table columns ---

  const columns: ColumnDef<SearchSummary, any>[] = [
    {
      accessorKey: 'searchedAt',
      header: 'Date',
      cell: ({ row }) =>
        renderComponent(DateDisplay, { date: row.original.searchedAt }),
    },
    { accessorKey: 'organisationName', header: 'Organisation' },
    { accessorKey: 'searchType', header: 'Type' },
    {
      accessorKey: 'visibility',
      header: 'Visibility',
      cell: ({ row }) =>
        renderComponent(VisibilityBadge, { visibility: row.original.visibility }),
    },
    { accessorKey: 'purposeText', header: 'Purpose' },
  ];
</script>

<svelte:head><title>Searches - CreditTimeline</title></svelte:head>

<div class="space-y-6">
  <div>
    <h2 class="text-2xl font-bold text-ink">Searches</h2>
    <p class="mt-1 text-muted">Credit search and enquiry history.</p>
  </div>

  <!-- Filter bar -->
  <form method="GET" class="flex flex-wrap items-center gap-4">
    <select
      name="visibility"
      aria-label="Filter by visibility"
      value={data.filters.visibility}
      onchange={(e) => e.currentTarget.form?.requestSubmit()}
      class="rounded-lg border border-soft bg-surface px-3 py-2 text-sm text-ink"
    >
      <option value="">All Visibility</option>
      <option value="hard">Hard</option>
      <option value="soft">Soft</option>
    </select>

    <input
      type="text"
      name="searchType"
      value={data.filters.searchType}
      placeholder="Filter by type..."
      onchange={(e) => e.currentTarget.form?.requestSubmit()}
      class="rounded-lg border border-soft bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted"
    />

    <input
      type="text"
      placeholder="Search table..."
      bind:value={globalFilter}
      class="rounded-lg border border-soft bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted"
    />

    <span class="text-sm text-muted">{data.total} result{data.total !== 1 ? 's' : ''}</span>
  </form>

  {#if data.items.length > 0}
    <!-- KPI Cards -->
    <div class="grid grid-cols-2 gap-6 lg:grid-cols-3">
      <StatCard label="Total Searches" value={data.total} />
      <StatCard label="Hard Searches" value={hardCount} />
      <StatCard label="Soft Searches" value={softCount} />
    </div>

    <!-- Charts row -->
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {#if hasTimeline}
        <section class="panel">
          <h3 class="mb-4 text-lg font-semibold text-ink">Search Timeline</h3>
          <EChart option={timelineOption} height="300px" class="w-full" />
        </section>
      {/if}

      {#if hasFrequency}
        <section class="panel">
          <h3 class="mb-4 text-lg font-semibold text-ink">Organisation Breakdown</h3>
          <EChart option={frequencyOption} height="300px" class="w-full" />
        </section>
      {/if}
    </div>

    <!-- Search History Table -->
    <section>
      <DataTable data={data.items} {columns} {globalFilter} />
    </section>

    <Pagination total={data.total} limit={data.limit} offset={data.offset} baseUrl="/searches" />
  {:else}
    <div class="panel text-center">
      <p class="text-muted">No searches found matching your filters.</p>
    </div>
  {/if}
</div>
