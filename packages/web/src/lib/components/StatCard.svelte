<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    label: string;
    value: string | number;
    subtext?: string;
    trend?: 'up' | 'down' | 'flat';
    icon?: Snippet;
    class?: string;
  }

  let { label, value, subtext, trend, icon, class: className = '' }: Props = $props();
</script>

<div class="panel {className}">
  <div class="flex items-start justify-between">
    <div>
      <p class="text-sm font-medium text-muted">{label}</p>
      <p class="mt-2 text-3xl font-bold text-ink">{value}</p>
      {#if subtext}
        <p class="mt-1 text-sm text-muted">{subtext}</p>
      {/if}
    </div>
    {#if icon}
      <div class="text-muted">
        {@render icon()}
      </div>
    {/if}
  </div>
  {#if trend}
    <div
      class="mt-3 flex items-center text-sm"
      class:text-success={trend === 'up'}
      class:text-danger={trend === 'down'}
      class:text-muted={trend === 'flat'}
    >
      {#if trend === 'up'}&#8593;{:else if trend === 'down'}&#8595;{:else}&#8594;{/if}
    </div>
  {/if}
</div>
