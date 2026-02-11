<script lang="ts">
  import { onMount } from 'svelte';
  import * as echarts from 'echarts/core';
  import { CanvasRenderer } from 'echarts/renderers';
  import { LineChart, GaugeChart, BarChart } from 'echarts/charts';
  import {
    TitleComponent,
    TooltipComponent,
    LegendComponent,
    GridComponent,
  } from 'echarts/components';
  import type { ECOption } from './chart-types.js';

  echarts.use([
    CanvasRenderer,
    LineChart,
    GaugeChart,
    BarChart,
    TitleComponent,
    TooltipComponent,
    LegendComponent,
    GridComponent,
  ]);

  interface Props {
    option: ECOption;
    height?: string;
    class?: string;
  }

  let { option, height = '300px', class: className = '' }: Props = $props();

  let container: HTMLDivElement;
  let chart: echarts.ECharts | null = null;

  onMount(() => {
    chart = echarts.init(container);
    chart.setOption(option);

    const observer = new ResizeObserver(() => {
      chart?.resize();
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
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

<div bind:this={container} class={className} style:height></div>
