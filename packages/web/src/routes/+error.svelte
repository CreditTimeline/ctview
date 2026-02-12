<script lang="ts">
  import { page } from '$app/stores';

  const messages: Record<number, string> = {
    401: 'Unauthorized',
    404: 'Page Not Found',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    503: 'Service Unavailable',
  };

  const heading = $derived(messages[$page.status] ?? 'Something Went Wrong');
</script>

<svelte:head><title>{$page.status} - CreditTimeline</title></svelte:head>

<div class="flex min-h-[60vh] flex-col items-center justify-center text-center">
  <p class="text-8xl font-bold text-accent">{$page.status}</p>
  <h1 class="mt-4 text-2xl font-bold text-ink">{heading}</h1>
  {#if $page.error?.message}
    <p class="mt-2 text-muted">{$page.error.message}</p>
  {/if}
  <a
    href="/"
    class="mt-8 inline-block rounded-lg bg-accent px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-accent-dark"
  >
    Back to Dashboard
  </a>
</div>
