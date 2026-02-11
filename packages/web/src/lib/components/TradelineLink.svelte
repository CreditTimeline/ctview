<script lang="ts">
  interface Props {
    tradelineId: string;
    label: string;
  }

  let { tradelineId, label }: Props = $props();
</script>

<a href="/tradelines/{tradelineId}" class="font-medium text-accent hover:underline">
  {label}
</a>
