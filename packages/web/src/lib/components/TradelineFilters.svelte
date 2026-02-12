<script lang="ts">
  interface Props {
    accountType: string;
    status: string;
    sourceSystem: string;
    class?: string;
  }

  let { accountType, status, sourceSystem, class: className = '' }: Props = $props();
</script>

<form method="GET" class="flex flex-wrap items-center gap-3 {className}">
  <select
    name="accountType"
    aria-label="Filter by account type"
    value={accountType}
    onchange={(e) => e.currentTarget.form?.requestSubmit()}
    class="rounded-lg border border-soft bg-surface px-3 py-2 text-sm text-ink"
  >
    <option value="">All Account Types</option>
    <option value="credit_card">Credit Card</option>
    <option value="mortgage">Mortgage</option>
    <option value="secured_loan">Secured Loan</option>
    <option value="unsecured_loan">Unsecured Loan</option>
    <option value="current_account">Current Account</option>
    <option value="telecom">Telecom</option>
    <option value="utility">Utility</option>
    <option value="budget_account">Budget Account</option>
    <option value="insurance">Insurance</option>
    <option value="rental">Rental</option>
    <option value="other">Other</option>
  </select>

  <select
    name="status"
    aria-label="Filter by status"
    value={status}
    onchange={(e) => e.currentTarget.form?.requestSubmit()}
    class="rounded-lg border border-soft bg-surface px-3 py-2 text-sm text-ink"
  >
    <option value="">All Statuses</option>
    <option value="up_to_date">Up to Date</option>
    <option value="settled">Settled</option>
    <option value="inactive">Inactive</option>
    <option value="arrangement">Arrangement</option>
    <option value="in_arrears">In Arrears</option>
    <option value="default">Default</option>
    <option value="gone_away">Gone Away</option>
    <option value="written_off">Written Off</option>
    <option value="transferred">Transferred</option>
  </select>

  <select
    name="sourceSystem"
    aria-label="Filter by agency"
    value={sourceSystem}
    onchange={(e) => e.currentTarget.form?.requestSubmit()}
    class="rounded-lg border border-soft bg-surface px-3 py-2 text-sm text-ink"
  >
    <option value="">All Agencies</option>
    <option value="equifax">Equifax</option>
    <option value="transunion">TransUnion</option>
    <option value="experian">Experian</option>
  </select>
</form>
