<script lang="ts">
  interface Props {
    total: number;
    limit: number;
    offset: number;
    baseUrl: string;
  }

  let { total, limit, offset, baseUrl }: Props = $props();

  const currentPage = $derived(Math.floor(offset / limit) + 1);
  const totalPages = $derived(Math.ceil(total / limit));
  const hasPrev = $derived(offset > 0);
  const hasNext = $derived(offset + limit < total);

  const rangeStart = $derived(total === 0 ? 0 : offset + 1);
  const rangeEnd = $derived(Math.min(offset + limit, total));

  function pageUrl(newOffset: number): string {
    const url = new URL(baseUrl, 'http://localhost');
    url.searchParams.set('offset', String(newOffset));
    url.searchParams.set('limit', String(limit));
    return `${url.pathname}${url.search}`;
  }
</script>

{#if totalPages > 1}
  <nav class="flex items-center justify-between" aria-label="Pagination">
    <p class="text-sm text-muted">
      Showing {rangeStart}–{rangeEnd} of {total}
    </p>
    <div class="flex items-center gap-2">
      {#if hasPrev}
        <a
          href={pageUrl(offset - limit)}
          class="rounded-lg border border-soft bg-surface px-3 py-1.5 text-sm font-medium text-accent transition-colors hover:bg-accent-light"
        >
          Previous
        </a>
      {:else}
        <span class="rounded-lg border border-soft bg-surface px-3 py-1.5 text-sm font-medium text-muted/50 cursor-not-allowed">
          Previous
        </span>
      {/if}

      <span class="text-sm text-muted">
        Page {currentPage} of {totalPages}
      </span>

      {#if hasNext}
        <a
          href={pageUrl(offset + limit)}
          class="rounded-lg border border-soft bg-surface px-3 py-1.5 text-sm font-medium text-accent transition-colors hover:bg-accent-light"
        >
          Next
        </a>
      {:else}
        <span class="rounded-lg border border-soft bg-surface px-3 py-1.5 text-sm font-medium text-muted/50 cursor-not-allowed">
          Next
        </span>
      {/if}
    </div>
  </nav>
{/if}
