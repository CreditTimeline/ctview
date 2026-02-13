<script lang="ts">
  import type { LatestScore } from '@ctview/core';
  import type { ECOption } from './chart-types.js';
  import EChart from './EChart.svelte';
  import AgencyBadge from './AgencyBadge.svelte';

  interface Props {
    score: LatestScore;
    class?: string;
  }

  let { score, class: className = '' }: Props = $props();

  const agencyColors: Record<string, string> = {
    equifax: '#e4002b',
    transunion: '#00a5e3',
    experian: '#1d4f91',
    other: '#78716c',
  };

  const color = $derived(agencyColors[score.sourceSystem] ?? agencyColors.other);
  const min = $derived(score.scoreMin ?? 0);
  const max = $derived(score.scoreMax ?? 1000);
  const value = $derived(score.scoreValue ?? 0);

  const gaugeOption: ECOption = $derived.by(() => ({
    series: [
      {
        type: 'gauge' as const,
        startAngle: 180,
        endAngle: 0,
        min,
        max,
        pointer: { show: false },
        progress: {
          show: true,
          roundCap: true,
          width: 18,
          itemStyle: { color },
        },
        axisLine: {
          lineStyle: { width: 18, color: [[1, '#e7e5e4']] },
          roundCap: true,
        },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: {
          distance: 25,
          fontSize: 11,
          color: '#78716c',
        },
        title: { show: false },
        detail: {
          fontSize: 32,
          fontWeight: 700,
          fontFamily: "'JetBrains Mono Variable', monospace",
          offsetCenter: [0, '-10%'],
          color: '#1c1917',
          formatter: `${value}`,
        },
        data: [{ value }],
      },
    ],
  }));
</script>

<div class="panel flex flex-col items-center {className}">
  <AgencyBadge agency={score.sourceSystem} size="md" />
  <EChart option={gaugeOption} height="180px" class="w-full" />
  {#if score.scoreBand}
    <p class="text-muted text-sm font-medium">{score.scoreBand}</p>
  {/if}
</div>
