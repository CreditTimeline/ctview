<script lang="ts">
  import { DateDisplay, AgencyBadge } from '$lib/components';

  let { data } = $props();
  const detail = $derived(data.detail);
</script>

<svelte:head><title>Import {detail.importId} - CreditTimeline</title></svelte:head>

<div class="space-y-8">
  <!-- Breadcrumb -->
  <a href="/imports" class="inline-flex items-center gap-1 text-sm text-accent hover:underline">
    &larr; All Imports
  </a>

  <!-- Metadata Card -->
  <div class="panel">
    <h2 class="text-2xl font-bold text-ink">Import Detail</h2>
    <div class="mt-4 grid grid-cols-2 gap-x-8 gap-y-3 text-sm md:grid-cols-3">
      <div>
        <p class="text-muted">Import ID</p>
        <p class="font-mono text-xs text-ink">{detail.importId}</p>
      </div>
      <div>
        <p class="text-muted">Source System</p>
        <p><AgencyBadge agency={detail.sourceSystem} /></p>
      </div>
      <div>
        <p class="text-muted">Acquisition Method</p>
        <p class="text-ink capitalize">{detail.acquisitionMethod.replace(/_/g, ' ')}</p>
      </div>
      <div>
        <p class="text-muted">Imported At</p>
        <p><DateDisplay date={detail.importedAt} /></p>
      </div>
      {#if detail.sourceWrapper}
        <div>
          <p class="text-muted">Source Wrapper</p>
          <p class="text-ink">{detail.sourceWrapper}</p>
        </div>
      {/if}
      {#if detail.mappingVersion}
        <div>
          <p class="text-muted">Mapping Version</p>
          <p class="text-ink">{detail.mappingVersion}</p>
        </div>
      {/if}
    </div>
    {#if detail.confidenceNotes}
      <div class="mt-4 border-t border-soft pt-4">
        <p class="text-xs font-semibold uppercase tracking-wider text-muted">Confidence Notes</p>
        <p class="mt-1 text-sm text-ink">{detail.confidenceNotes}</p>
      </div>
    {/if}
  </div>

  <!-- Receipt Section -->
  {#if detail.receipt}
    <div class="panel">
      <h3 class="text-lg font-semibold text-ink">Ingest Receipt</h3>
      <div class="mt-4 grid grid-cols-2 gap-x-8 gap-y-3 text-sm md:grid-cols-3">
        <div>
          <p class="text-muted">Status</p>
          <span class="badge {detail.receipt.status === 'success' ? 'bg-success-light text-success' : 'bg-danger-light text-danger'}">
            {detail.receipt.status}
          </span>
        </div>
        <div>
          <p class="text-muted">Ingested At</p>
          <p><DateDisplay date={detail.receipt.ingestedAt} /></p>
        </div>
        {#if detail.receipt.durationMs !== null}
          <div>
            <p class="text-muted">Duration</p>
            <p class="font-mono text-ink">{detail.receipt.durationMs}ms</p>
          </div>
        {/if}
      </div>
      {#if detail.receipt.entityCounts}
        <div class="mt-4 border-t border-soft pt-4">
          <p class="text-xs font-semibold uppercase tracking-wider text-muted">Entity Counts</p>
          <div class="mt-2 grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
            {#each Object.entries(detail.receipt.entityCounts) as [entity, count]}
              <div class="rounded-lg bg-canvas p-2">
                <p class="font-medium text-ink">{count}</p>
                <p class="text-xs text-muted">{entity}</p>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Raw Artifacts -->
  {#if detail.rawArtifacts.length > 0}
    <div class="panel">
      <h3 class="text-lg font-semibold text-ink">Raw Artifacts</h3>
      <div class="mt-4 space-y-3">
        {#each detail.rawArtifacts as artifact (artifact.artifactId)}
          <div class="flex items-center gap-4 rounded-lg bg-canvas p-3 text-sm">
            <span class="badge bg-soft text-muted">{artifact.artifactType}</span>
            <span class="font-mono text-xs text-muted" title={artifact.sha256}>
              SHA-256: {artifact.sha256.slice(0, 16)}&hellip;
            </span>
            {#if artifact.uri}
              <a href={artifact.uri} class="text-accent hover:underline" target="_blank" rel="noopener">
                View
              </a>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>
