<script lang="ts">
  let { data } = $props();
</script>

<svelte:head>
  <title>Dashboard - CreditTimeline</title>
</svelte:head>

<div class="space-y-8">
  <div>
    <h2 class="text-2xl font-bold text-gray-900">Dashboard</h2>
    <p class="mt-1 text-gray-600">Overview of your credit file data.</p>
  </div>

  <!-- Summary cards -->
  <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
    <div class="rounded-xl border border-gray-200 bg-white p-6">
      <p class="text-sm font-medium text-gray-500">Tradelines</p>
      <p class="mt-2 text-3xl font-bold text-gray-900">{data.counts.tradelines}</p>
    </div>
    <div class="rounded-xl border border-gray-200 bg-white p-6">
      <p class="text-sm font-medium text-gray-500">Imports</p>
      <p class="mt-2 text-3xl font-bold text-gray-900">{data.counts.imports}</p>
    </div>
    <div class="rounded-xl border border-gray-200 bg-white p-6">
      <p class="text-sm font-medium text-gray-500">Searches</p>
      <p class="mt-2 text-3xl font-bold text-gray-900">{data.counts.searches}</p>
    </div>
    <div class="rounded-xl border border-gray-200 bg-white p-6">
      <p class="text-sm font-medium text-gray-500">Credit Scores</p>
      <p class="mt-2 text-3xl font-bold text-gray-900">{data.counts.scores}</p>
    </div>
  </div>

  {#if data.counts.imports === 0}
    <div class="rounded-xl border border-blue-200 bg-blue-50 p-8 text-center">
      <h3 class="text-lg font-semibold text-blue-900">No data yet</h3>
      <p class="mt-2 text-blue-700">
        Import your first credit report by sending a POST request to
        <code class="rounded bg-blue-100 px-2 py-0.5 text-sm">/api/v1/ingest</code>
      </p>
    </div>
  {/if}
</div>
