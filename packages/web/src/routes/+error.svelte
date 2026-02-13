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
  <p class="text-accent text-8xl font-bold">{$page.status}</p>
  <h1 class="text-ink mt-4 text-2xl font-bold">{heading}</h1>
  {#if $page.error?.message}
    <p class="text-muted mt-2">{$page.error.message}</p>
  {/if}
  <a
    href="/"
    class="bg-accent hover:bg-accent-dark mt-8 inline-block rounded-lg px-6 py-3 text-sm font-medium text-white transition-colors"
  >
    Back to Dashboard
  </a>
</div>
