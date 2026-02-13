<script lang="ts">
  interface Props {
    visibility: string | null;
    class?: string;
  }

  let { visibility, class: className = '' }: Props = $props();

  const config: Record<string, { label: string; bg: string; text: string }> = {
    hard: { label: 'Hard', bg: 'bg-danger-light', text: 'text-danger' },
    soft: { label: 'Soft', bg: 'bg-info-light', text: 'text-info' },
  };

  const style = $derived(
    config[visibility ?? ''] ?? {
      label: visibility ?? 'Unknown',
      bg: 'bg-soft',
      text: 'text-muted',
    },
  );
</script>

<span class="badge {style.bg} {style.text} {className}">{style.label}</span>
