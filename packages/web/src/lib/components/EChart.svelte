<script lang="ts">
  import { onMount } from 'svelte';
  import type { ECOption } from './chart-types.js';
  import type { ECharts } from 'echarts/core';

  interface Props {
    option: ECOption;
    height?: string;
    class?: string;
    ariaLabel?: string;
  }

  let { option, height = '300px', class: className = '', ariaLabel }: Props = $props();

  let container: HTMLDivElement;
  let chart: ECharts | null = null;
  let loaded = $state(false);

  let observer: ResizeObserver | null = null;

  onMount(() => {
    async function init() {
      const [core, renderers, charts, components] = await Promise.all([
        import('echarts/core'),
        import('echarts/renderers'),
        import('echarts/charts'),
        import('echarts/components'),
      ]);

      core.use([
        renderers.CanvasRenderer,
        charts.LineChart,
        charts.GaugeChart,
        charts.BarChart,
        components.TitleComponent,
        components.TooltipComponent,
        components.LegendComponent,
        components.GridComponent,
      ]);

      loaded = true;
      chart = core.init(container);
      chart.setOption(option);

      observer = new ResizeObserver(() => {
        chart?.resize();
      });
      observer.observe(container);
    }

    init();

    return () => {
      observer?.disconnect();
      chart?.dispose();
      chart = null;
    };
  });

  $effect(() => {
    if (chart) {
      chart.setOption(option, { notMerge: true });
    }
  });
</script>

{#if !loaded}
  <div class={className} style:height style:display="flex" style:align-items="center" style:justify-content="center">
    <span class="text-sm text-muted">Loading chart...</span>
  </div>
{/if}
<div bind:this={container} class={className} style:height style:display={loaded ? undefined : 'none'} role="img" aria-label={ariaLabel}></div>
