<script lang="ts">
  import type { AddressWithAssociations } from '@ctview/core';
  import DateDisplay from '$lib/components/DateDisplay.svelte';
  import StatCard from '$lib/components/StatCard.svelte';
  import AgencyBadge from '$lib/components/AgencyBadge.svelte';
  import Pagination from '$lib/components/Pagination.svelte';

  let { data } = $props();

  function formatAddress(addr: AddressWithAssociations): string {
    return [addr.line1, addr.line2, addr.line3, addr.townCity, addr.countyRegion, addr.postcode]
      .filter(Boolean)
      .join(', ');
  }

  const currentCount = $derived(
    data.items.filter((a) => a.associations.some((assoc) => !assoc.validTo)).length,
  );
</script>

<svelte:head><title>Addresses - CreditTimeline</title></svelte:head>

<div class="space-y-8">
  <div>
    <h2 class="text-ink text-2xl font-bold">Addresses</h2>
    <p class="text-muted mt-1 text-sm">Address history, electoral roll, and move history.</p>
  </div>

  <!-- KPI Stats -->
  <div class="grid grid-cols-2 gap-6 lg:grid-cols-3">
    <StatCard label="Total Addresses" value={data.total} />
    <StatCard label="Current" value={currentCount} />
    <StatCard label="Previous" value={data.total - currentCount} />
  </div>

  <!-- Address Cards -->
  {#if data.items.length > 0}
    <div class="space-y-6">
      {#each data.items as addr (addr.addressId)}
        <div class="panel">
          <h3 class="text-ink text-lg font-semibold">{formatAddress(addr)}</h3>

          <!-- Associations -->
          {#if addr.associations.length > 0}
            <div class="mt-4 space-y-2">
              {#each addr.associations as assoc (assoc.associationId)}
                <div class="flex items-center gap-2 text-sm">
                  <span
                    class="badge {assoc.role === 'current'
                      ? 'bg-success-light text-success'
                      : 'bg-soft text-muted'}"
                  >
                    {assoc.role ?? 'unknown'}
                  </span>
                  <span class="text-muted">
                    <DateDisplay date={assoc.validFrom} />
                    &rarr;
                    {#if assoc.validTo}
                      <DateDisplay date={assoc.validTo} />
                    {:else}
                      <span class="badge bg-accent-light text-accent">Current</span>
                    {/if}
                  </span>
                </div>
              {/each}
            </div>
          {/if}

          <!-- Electoral Roll -->
          {#if addr.electoralRollEntries.length > 0}
            <div class="border-soft mt-4 border-t pt-4">
              <p class="text-muted text-xs font-semibold tracking-wider uppercase">
                Electoral Roll
              </p>
              <div class="mt-2 space-y-1">
                {#each addr.electoralRollEntries as entry (entry.electoralEntryId)}
                  <div class="flex items-center gap-3 text-sm">
                    <span class="text-ink">{entry.nameOnRegister ?? 'Unknown'}</span>
                    <span class="text-muted">
                      <DateDisplay date={entry.registeredFrom} />
                      &rarr;
                      {#if entry.registeredTo}
                        <DateDisplay date={entry.registeredTo} />
                      {:else}
                        <span class="text-accent">Present</span>
                      {/if}
                    </span>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      {/each}
    </div>
    <Pagination total={data.total} limit={data.limit} offset={data.offset} baseUrl="/addresses" />
  {:else}
    <div class="panel text-muted text-center">
      <p>No addresses found.</p>
    </div>
  {/if}

  <!-- Move History Timeline -->
  {#if data.addressLinks.length > 0}
    <section>
      <h3 class="text-ink mb-4 text-lg font-semibold">Move History</h3>
      <div class="space-y-4">
        {#each data.addressLinks as link (link.linkId)}
          <div class="flex items-start gap-4">
            <div class="flex flex-col items-center">
              <div class="bg-accent h-3 w-3 rounded-full"></div>
              <div class="bg-soft h-full w-0.5"></div>
            </div>
            <div class="panel flex-1">
              <div class="text-muted flex items-center gap-2 text-sm">
                {#if link.linkedAt}<DateDisplay date={link.linkedAt} />{/if}
                <AgencyBadge agency={link.sourceSystem} />
              </div>
              <div class="mt-2 flex items-center gap-3 text-sm">
                <span class="text-muted">{link.fromAddress}</span>
                <span class="text-accent font-medium">&rarr;</span>
                <span class="text-ink font-medium">{link.toAddress}</span>
              </div>
            </div>
          </div>
        {/each}
      </div>
    </section>
  {/if}
</div>
