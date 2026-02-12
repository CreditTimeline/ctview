<script lang="ts">
  interface Props {
    recordType: string | null;
    class?: string;
  }

  let { recordType, class: className = '' }: Props = $props();

  const config: Record<string, { label: string; bg: string; text: string }> = {
    ccj: { label: 'CCJ', bg: 'bg-danger-light', text: 'text-danger' },
    iva: { label: 'IVA', bg: 'bg-warning-light', text: 'text-warning' },
    dro: { label: 'DRO', bg: 'bg-warning-light', text: 'text-warning' },
    bankruptcy: { label: 'Bankruptcy', bg: 'bg-danger-light', text: 'text-danger' },
  };

  const normalized = $derived((recordType ?? '').toLowerCase());
  const style = $derived(config[normalized] ?? { label: recordType ?? 'Unknown', bg: 'bg-soft', text: 'text-muted' });
</script>

<span class="badge {style.bg} {style.text} {className}">{style.label}</span>
