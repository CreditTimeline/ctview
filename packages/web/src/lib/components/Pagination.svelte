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
    <p class="text-muted text-sm">
      Showing {rangeStart}–{rangeEnd} of {total}
    </p>
    <div class="flex items-center gap-2">
      {#if hasPrev}
        <a
          href={pageUrl(offset - limit)}
          class="border-soft bg-surface text-accent hover:bg-accent-light rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors"
        >
          Previous
        </a>
      {:else}
        <span
          class="border-soft bg-surface text-muted/50 cursor-not-allowed rounded-lg border px-3 py-1.5 text-sm font-medium"
        >
          Previous
        </span>
      {/if}

      <span class="text-muted text-sm">
        Page {currentPage} of {totalPages}
      </span>

      {#if hasNext}
        <a
          href={pageUrl(offset + limit)}
          class="border-soft bg-surface text-accent hover:bg-accent-light rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors"
        >
          Next
        </a>
      {:else}
        <span
          class="border-soft bg-surface text-muted/50 cursor-not-allowed rounded-lg border px-3 py-1.5 text-sm font-medium"
        >
          Next
        </span>
      {/if}
    </div>
  </nav>
{/if}
