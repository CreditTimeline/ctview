<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    text: string;
    position?: 'top' | 'bottom';
    children: Snippet;
  }

  let { text, position = 'top', children }: Props = $props();
  let visible = $state(false);
</script>

<span
  class="relative inline-flex"
  onmouseenter={() => (visible = true)}
  onmouseleave={() => (visible = false)}
>
  {@render children()}
  {#if visible}
    <span
      class="bg-ink pointer-events-none absolute z-50 w-56 rounded-lg px-3 py-2 text-left text-xs leading-relaxed text-white shadow-lg
        {position === 'top'
        ? 'bottom-full left-1/2 mb-2 -translate-x-1/2'
        : 'top-full left-1/2 mt-2 -translate-x-1/2'}"
    >
      {text}
      <span
        class="absolute left-1/2 -translate-x-1/2 border-[5px] border-transparent
          {position === 'top' ? 'border-t-ink top-full' : 'border-b-ink bottom-full'}"
      ></span>
    </span>
  {/if}
</span>
