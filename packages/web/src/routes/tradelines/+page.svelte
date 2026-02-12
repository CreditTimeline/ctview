<script lang="ts">
  import type { TradelineSummary } from '@ctview/core';
  import type { ColumnDef } from '@tanstack/svelte-table';
  import { renderComponent } from '@tanstack/svelte-table';
  import {
    DataTable,
    StatusBadge,
    AgencyBadge,
    AccountTypeBadge,
    MoneyDisplay,
    DateDisplay,
    TradelineFilters,
    TradelineLink,
    Pagination,
  } from '$lib/components';

  let { data } = $props();

  let globalFilter = $state('');

  const columns: ColumnDef<TradelineSummary, any>[] = [
    {
      accessorKey: 'furnisherName',
      header: 'Furnisher',
      cell: ({ row }) =>
        renderComponent(TradelineLink, {
          tradelineId: row.original.tradelineId,
          label: row.original.furnisherName ?? 'Unknown',
        }),
    },
    {
      accessorKey: 'accountType',
      header: 'Type',
      cell: ({ row }) =>
        renderComponent(AccountTypeBadge, { accountType: row.original.accountType }),
    },
    {
      accessorKey: 'statusCurrent',
      header: 'Status',
      cell: ({ row }) =>
        renderComponent(StatusBadge, { status: row.original.statusCurrent }),
    },
    {
      accessorKey: 'sourceSystem',
      header: 'Agency',
      cell: ({ row }) =>
        renderComponent(AgencyBadge, { agency: row.original.sourceSystem }),
    },
    {
      accessorKey: 'latestBalance',
      header: 'Balance',
      cell: ({ row }) =>
        renderComponent(MoneyDisplay, { amount: row.original.latestBalance }),
    },
    {
      accessorKey: 'latestCreditLimit',
      header: 'Credit Limit',
      cell: ({ row }) =>
        renderComponent(MoneyDisplay, { amount: row.original.latestCreditLimit }),
    },
    {
      accessorKey: 'openedAt',
      header: 'Opened',
      cell: ({ row }) =>
        renderComponent(DateDisplay, { date: row.original.openedAt }),
    },
    {
      accessorKey: 'closedAt',
      header: 'Closed',
      cell: ({ row }) =>
        renderComponent(DateDisplay, { date: row.original.closedAt }),
    },
    {
      accessorKey: 'latestSnapshotDate',
      header: 'Last Updated',
      cell: ({ row }) =>
        renderComponent(DateDisplay, {
          date: row.original.latestSnapshotDate,
          relative: true,
        }),
    },
  ];
</script>

<svelte:head><title>Tradelines - CreditTimeline</title></svelte:head>

<div class="space-y-6">
  <div>
    <h2 class="text-2xl font-bold text-ink">Tradelines</h2>
    <p class="mt-1 text-muted">Credit agreements and account history.</p>
  </div>

  <div class="flex flex-wrap items-center gap-4">
    <TradelineFilters
      accountType={data.filters.accountType}
      status={data.filters.status}
      sourceSystem={data.filters.sourceSystem}
    />
    <input
      type="text"
      placeholder="Search tradelines…"
      bind:value={globalFilter}
      class="rounded-lg border border-soft bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted"
    />
    <span class="text-sm text-muted">{data.total} result{data.total !== 1 ? 's' : ''}</span>
  </div>

  {#if data.items.length > 0}
    <DataTable data={data.items} {columns} {globalFilter} />
    <Pagination total={data.total} limit={data.limit} offset={data.offset} baseUrl="/tradelines" />
  {:else}
    <div class="panel text-center">
      <p class="text-muted">No tradelines found matching your filters.</p>
    </div>
  {/if}
</div>
