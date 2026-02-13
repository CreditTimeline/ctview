<script lang="ts">
  interface Props {
    tradelineId: string;
    label: string;
  }

  let { tradelineId, label }: Props = $props();
</script>

<a href="/tradelines/{tradelineId}" class="text-accent font-medium hover:underline">
  {label}
</a>
