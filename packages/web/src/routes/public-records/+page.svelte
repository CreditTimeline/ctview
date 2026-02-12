<script lang="ts">
  import type { PublicRecordSummary } from '@ctview/core';
  import type { ColumnDef } from '@tanstack/svelte-table';
  import { renderComponent } from '@tanstack/svelte-table';
  import { DataTable, DateDisplay, MoneyDisplay, AgencyBadge, StatCard } from '$lib/components';
  import RecordTypeBadge from '$lib/components/RecordTypeBadge.svelte';

  let { data } = $props();

  // --- Derived KPIs ---

  const activeCount = $derived(data.items.filter((r) => !r.satisfiedAt).length);
  const totalAmount = $derived(data.items.reduce((sum, r) => sum + (r.amount ?? 0), 0));

  // --- Helpers ---

  function formatPence(pence: number): string {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(pence / 100);
  }

  function daysSince(dateStr: string | null): number | null {
    if (!dateStr) return null;
    const diff = Date.now() - new Date(dateStr).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  // --- Table columns ---

  const columns: ColumnDef<PublicRecordSummary, any>[] = [
    {
      accessorKey: 'recordType',
      header: 'Type',
      cell: ({ row }) =>
        renderComponent(RecordTypeBadge, { recordType: row.original.recordType }),
    },
    { accessorKey: 'courtOrRegister', header: 'Court/Register' },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) =>
        renderComponent(MoneyDisplay, { amount: row.original.amount }),
    },
    {
      accessorKey: 'recordedAt',
      header: 'Recorded',
      cell: ({ row }) =>
        renderComponent(DateDisplay, { date: row.original.recordedAt }),
    },
    {
      accessorKey: 'satisfiedAt',
      header: 'Satisfied',
      cell: ({ row }) => {
        if (row.original.satisfiedAt) {
          return renderComponent(DateDisplay, { date: row.original.satisfiedAt });
        }
        return 'Outstanding';
      },
    },
    { accessorKey: 'status', header: 'Status' },
    {
      accessorKey: 'sourceSystem',
      header: 'Source',
      cell: ({ row }) =>
        renderComponent(AgencyBadge, { agency: row.original.sourceSystem }),
    },
  ];
</script>

<svelte:head><title>Public Records - CreditTimeline</title></svelte:head>

<div class="space-y-8">
  <div>
    <h2 class="text-2xl font-bold text-ink">Public Records</h2>
    <p class="mt-1 text-muted">CCJs, bankruptcies, and other public records.</p>
  </div>

  {#if data.items.length > 0}
    <!-- KPI Cards -->
    <div class="grid grid-cols-2 gap-6 lg:grid-cols-3">
      <StatCard label="Total Records" value={data.total} />
      <StatCard label="Active (Unsatisfied)" value={activeCount} />
      <StatCard label="Total Amount" value={formatPence(totalAmount)} />
    </div>

    <!-- Result count -->
    <span class="text-sm text-muted">{data.total} result{data.total !== 1 ? 's' : ''}</span>

    <!-- Public Records Table -->
    <section>
      <DataTable data={data.items} {columns} />
    </section>

    <!-- Outstanding records age summary -->
    {#if activeCount > 0}
      <section class="panel">
        <h3 class="mb-4 text-lg font-semibold text-ink">Outstanding Records</h3>
        <div class="space-y-2">
          {#each data.items.filter((r) => !r.satisfiedAt) as record}
            {@const days = daysSince(record.recordedAt)}
            <div class="flex items-center justify-between rounded-lg border border-soft/50 px-4 py-3">
              <div class="flex items-center gap-3">
                <RecordTypeBadge recordType={record.recordType} />
                <span class="text-sm text-ink">{record.courtOrRegister ?? 'Unknown court'}</span>
              </div>
              <div class="flex items-center gap-4">
                <MoneyDisplay amount={record.amount} />
                {#if days !== null}
                  <span class="text-sm text-muted">{days} days outstanding</span>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </section>
    {/if}
  {:else}
    <div class="rounded-xl border border-success/30 bg-success-light p-8 text-center">
      <h3 class="text-lg font-semibold text-success">No Public Records</h3>
      <p class="mt-2 text-success/80">No CCJs, IVAs, or bankruptcies on file.</p>
    </div>
  {/if}
</div>
