<script lang="ts">
  import { format, parseISO, formatDistanceToNow } from 'date-fns';

  interface Props {
    date: string | null;
    pattern?: string;
    relative?: boolean;
    class?: string;
  }

  let { date, pattern = 'd MMM yyyy', relative = false, class: className = '' }: Props = $props();

  const display = $derived.by(() => {
    if (!date) return '\u2014';
    const parsed = parseISO(date);
    if (relative) return formatDistanceToNow(parsed, { addSuffix: true });
    return format(parsed, pattern);
  });
</script>

<time datetime={date ?? undefined} title={date ?? undefined} class={className}>
  {display}
</time>
