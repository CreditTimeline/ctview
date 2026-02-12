<script lang="ts">
  interface Props {
    importId: string;
  }

  let { importId }: Props = $props();
</script>

<a href="/imports/{importId}" class="text-accent hover:underline">View</a>
