<script lang="ts">
  interface Props {
    agency: string;
    size?: 'sm' | 'md';
    class?: string;
  }

  let { agency, size = 'sm', class: className = '' }: Props = $props();

  const config: Record<string, { label: string; colorClass: string }> = {
    equifax: { label: 'Equifax', colorClass: 'bg-equifax/10 text-equifax' },
    transunion: { label: 'TransUnion', colorClass: 'bg-transunion/10 text-transunion' },
    experian: { label: 'Experian', colorClass: 'bg-experian/10 text-experian' },
    other: { label: 'Other', colorClass: 'bg-soft text-muted' },
  };

  const resolved = $derived(config[agency] ?? config.other);
</script>

<span class="badge {resolved.colorClass} {size === 'md' ? 'px-3 py-1 text-sm' : ''} {className}">
  {resolved.label}
</span>
