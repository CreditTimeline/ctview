<script lang="ts" generics="TData">
  import {
    createTable,
    FlexRender,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    type ColumnDef,
    type SortingState,
  } from '@tanstack/svelte-table';

  interface Props {
    data: TData[];
    columns: ColumnDef<TData, any>[];
    globalFilter?: string;
    class?: string;
  }

  let { data, columns, globalFilter = '', class: className = '' }: Props = $props();

  let sorting = $state<SortingState>([]);

  const table = createTable({
    get data() { return data; },
    get columns() { return columns; },
    state: {
      get sorting() { return sorting; },
      get globalFilter() { return globalFilter; },
    },
    onSortingChange: (updater) => {
      sorting = typeof updater === 'function' ? updater(sorting) : updater;
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });
</script>

<div class="panel overflow-x-auto {className}">
  <table class="w-full text-left text-sm">
    <thead>
      {#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
        <tr class="border-b border-soft">
          {#each headerGroup.headers as header (header.id)}
            <th
              scope="col"
              class="px-3 py-3 text-xs font-semibold uppercase tracking-wider text-muted"
              class:cursor-pointer={header.column.getCanSort()}
              onclick={header.column.getToggleSortingHandler()}
            >
              {#if !header.isPlaceholder}
                <div class="flex items-center gap-1">
                  <FlexRender content={header.column.columnDef.header} context={header.getContext()} />
                  {#if header.column.getIsSorted() === 'asc'}
                    <span>&#8593;</span>
                  {:else if header.column.getIsSorted() === 'desc'}
                    <span>&#8595;</span>
                  {/if}
                </div>
              {/if}
            </th>
          {/each}
        </tr>
      {/each}
    </thead>
    <tbody>
      {#each table.getRowModel().rows as row (row.id)}
        <tr class="border-b border-soft/50 transition-colors hover:bg-canvas">
          {#each row.getVisibleCells() as cell (cell.id)}
            <td class="px-3 py-3 text-ink">
              <FlexRender content={cell.column.columnDef.cell} context={cell.getContext()} />
            </td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</div>
