<script lang="ts">
  interface Props {
    status: string | null;
  }

  let { status }: Props = $props();

  const colorClass = $derived(
    status === 'success'
      ? 'bg-success-light text-success'
      : status === 'error'
        ? 'bg-danger-light text-danger'
        : 'bg-soft text-muted',
  );
</script>

<span class="badge {colorClass}">
  {status ?? 'unknown'}
</span>
