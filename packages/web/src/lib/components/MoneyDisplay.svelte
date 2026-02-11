<script lang="ts">
  interface Props {
    /** Amount in minor currency units (pence) */
    amount: number | null;
    /** ISO 4217 currency code */
    currency?: string;
    /** Show +/- sign explicitly */
    showSign?: boolean;
    class?: string;
  }

  let { amount, currency = 'GBP', showSign = false, class: className = '' }: Props = $props();

  const formatted = $derived.by(() => {
    if (amount === null || amount === undefined) return '\u2014'; // em-dash
    const value = amount / 100;
    const formatter = new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const str = formatter.format(Math.abs(value));
    if (showSign && value > 0) return `+${str}`;
    if (value < 0) return `-${str}`;
    return str;
  });

  const isNegative = $derived(amount !== null && amount < 0);
</script>

<span class="money {className}" class:text-danger={isNegative}>
  {formatted}
</span>
