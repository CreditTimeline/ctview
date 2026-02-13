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
      <p class="text-muted text-sm font-medium">{label}</p>
      <p class="text-ink mt-2 text-3xl font-bold">{value}</p>
      {#if subtext}
        <p class="text-muted mt-1 text-sm">{subtext}</p>
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
