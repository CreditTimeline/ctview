<script lang="ts">
  import type { ImportListItem } from '@ctview/core';
  import type { ColumnDef } from '@tanstack/svelte-table';
  import { renderComponent } from '@tanstack/svelte-table';
  import { DataTable, DateDisplay, AgencyBadge, Pagination } from '$lib/components';
  import FileUpload from '$lib/components/FileUpload.svelte';
  import ImportStatusBadge from '$lib/components/ImportStatusBadge.svelte';
  import ImportViewLink from '$lib/components/ImportViewLink.svelte';

  let { data } = $props();

  function formatEntityCounts(counts: Record<string, number> | null): string {
    if (!counts) return '\u2014';
    return (
      Object.entries(counts)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => `${v} ${k}`)
        .join(', ') || '\u2014'
    );
  }

  const columns: ColumnDef<ImportListItem, unknown>[] = [
    {
      accessorKey: 'importedAt',
      header: 'Date',
      cell: ({ row }) =>
        renderComponent(DateDisplay, {
          date: row.original.importedAt,
          relative: true,
        }),
    },
    {
      accessorKey: 'sourceSystem',
      header: 'Source System',
      cell: ({ row }) => renderComponent(AgencyBadge, { agency: row.original.sourceSystem }),
    },
    {
      accessorKey: 'acquisitionMethod',
      header: 'Method',
      cell: ({ getValue }) => {
        const val = getValue() as string;
        return val
          ? val.replace(/_/g, ' ').replace(/^\w/, (c: string) => c.toUpperCase())
          : '\u2014';
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => renderComponent(ImportStatusBadge, { status: row.original.status }),
    },
    {
      accessorKey: 'durationMs',
      header: 'Duration',
      cell: ({ getValue }) => {
        const ms = getValue() as number | null;
        return ms !== null ? `${ms}ms` : '\u2014';
      },
    },
    {
      accessorKey: 'entityCounts',
      header: 'Entities',
      cell: ({ getValue }) => formatEntityCounts(getValue() as Record<string, number> | null),
      enableSorting: false,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => renderComponent(ImportViewLink, { importId: row.original.importId }),
      enableSorting: false,
    },
  ];
</script>

<svelte:head><title>Imports - CreditTimeline</title></svelte:head>

<div class="space-y-6">
  <div>
    <h2 class="text-ink text-2xl font-bold">Imports</h2>
    <p class="text-muted mt-1">Upload normalised credit files and view ingestion history.</p>
  </div>

  <FileUpload />

  {#if data.items.length > 0}
    <div>
      <span class="text-muted text-sm">{data.total} import{data.total !== 1 ? 's' : ''}</span>
    </div>
    <DataTable data={data.items} {columns} />
    <Pagination total={data.total} limit={data.limit} offset={data.offset} baseUrl="/imports" />
  {:else}
    <div class="panel text-center">
      <p class="text-muted">No imports yet. Upload a credit file to get started.</p>
    </div>
  {/if}
</div>
