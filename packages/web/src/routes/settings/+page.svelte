<script lang="ts">
  import { StatCard, DateDisplay, Tooltip } from '$lib/components';

  let { data } = $props();

  // --- Derived state ---

  const metaKeys = new Set(['reports', 'imports']);
  const totalRecords = $derived(
    Object.entries(data.health.tableCounts)
      .filter(([k]) => !metaKeys.has(k))
      .reduce((a, [, b]) => a + b, 0),
  );

  // --- Test Ingest ---

  let testingIngest = $state(false);
  let testResult = $state<{ success: boolean; message: string } | null>(null);

  async function testIngest() {
    testingIngest = true;
    testResult = null;
    try {
      const ts = Date.now();
      const importId = `imp_test_${ts}`;
      const res = await fetch('/api/v1/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schema_version: '1.0.0',
          file_id: `file_test_${ts}`,
          subject_id: `subj_health_${ts}`,
          created_at: new Date().toISOString(),
          currency_code: 'GBP',
          imports: [
            {
              import_id: importId,
              imported_at: new Date().toISOString(),
              source_system: 'other',
              acquisition_method: 'other',
            },
          ],
          subject: {
            subject_id: `subj_health_${ts}`,
            names: [
              {
                name_id: `name_test_${ts}`,
                full_name: 'Health Check',
                name_type: 'legal',
                source_import_id: importId,
              },
            ],
          },
        }),
      });
      if (res.ok) {
        testResult = { success: true, message: 'Ingest endpoint is working.' };
      } else {
        const body = await res.json();
        testResult = {
          success: false,
          message: body.error?.message ?? `Failed (${res.status})`,
        };
      }
    } catch {
      testResult = { success: false, message: 'Connection failed.' };
    } finally {
      testingIngest = false;
    }
  }

  // --- Settings Editor ---

  const countTooltips: Record<string, string> = {
    reports: 'The number of credit report files uploaded to ctview.',
    imports: 'The number of agency-specific data batches processed. A single report file may contain multiple imports if it includes data from more than one credit agency.',
  };

  const readOnlyKeys = ['ddl_hash'];
  let settingsState = $state([...data.settings]);
  let editingKey = $state<string | null>(null);
  let editValue = $state('');
  let newKey = $state('');
  let newValue = $state('');

  function startEdit(key: string, value: string) {
    editingKey = key;
    editValue = value;
  }

  async function saveSetting(key: string) {
    const res = await fetch('/api/v1/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value: editValue }),
    });
    if (res.ok) {
      const body = await res.json();
      const updated = body.data;
      const idx = settingsState.findIndex((s) => s.key === key);
      if (idx >= 0) {
        settingsState[idx] = {
          key: updated.key,
          value: updated.value,
          updatedAt: updated.updatedAt,
        };
      }
      editingKey = null;
    }
  }

  async function addSetting() {
    const res = await fetch('/api/v1/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: newKey, value: newValue }),
    });
    if (res.ok) {
      const body = await res.json();
      const updated = body.data;
      settingsState.push({
        key: updated.key,
        value: updated.value,
        updatedAt: updated.updatedAt,
      });
      settingsState = settingsState;
      newKey = '';
      newValue = '';
    }
  }
</script>

<svelte:head>
  <title>Settings - CreditTimeline</title>
</svelte:head>

<div class="space-y-8">
  <div>
    <h2 class="text-2xl font-bold text-ink">Settings</h2>
    <p class="mt-1 text-muted">System configuration and health monitoring.</p>
  </div>

  <!-- System Health Summary -->
  <section>
    <h3 class="mb-4 text-lg font-semibold text-ink">System Health</h3>
    <div class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      <StatCard label="Total Records" value={totalRecords} />
      <StatCard
        label="DB Engine"
        value={data.health.dbEngine.toUpperCase()}
      />
      <StatCard
        label="Schema Hash"
        value={data.health.schemaVersion?.slice(0, 8) ?? 'N/A'}
      />
    </div>
  </section>

  <!-- Database Info -->
  <section class="panel">
    <h3 class="text-lg font-semibold text-ink">Database</h3>
    <div
      class="mt-4 grid grid-cols-2 gap-x-8 gap-y-3 text-sm md:grid-cols-3"
    >
      <div>
        <p class="text-muted">Engine</p>
        <p class="font-medium text-ink capitalize">{data.health.dbEngine}</p>
      </div>
      <div>
        <p class="text-muted">Schema Version</p>
        <p class="font-mono text-xs text-ink">
          {data.health.schemaVersion ?? 'Unknown'}
        </p>
      </div>
      <div>
        <p class="text-muted">Last Ingest</p>
        {#if data.health.lastIngestAt}
          <p><DateDisplay date={data.health.lastIngestAt} relative /></p>
        {:else}
          <p class="text-muted">Never</p>
        {/if}
      </div>
    </div>

    <!-- Table Row Counts -->
    <div class="mt-4 border-t border-soft pt-4">
      <p class="text-xs font-semibold uppercase tracking-wider text-muted">
        Table Row Counts
      </p>
      <div
        class="mt-2 grid grid-cols-2 gap-2 text-sm md:grid-cols-3 lg:grid-cols-6"
      >
        {#each Object.entries(data.health.tableCounts) as [table, count]}
          <div class="relative rounded-lg bg-canvas p-3 text-center">
            <p class="text-xl font-bold text-ink">{count}</p>
            <p class="text-xs text-muted capitalize">
              {table.replace(/([A-Z])/g, ' $1').trim()}
            </p>
            {#if countTooltips[table]}
              <span class="absolute bottom-1.5 right-1.5">
                <Tooltip text={countTooltips[table]} position="top">
                  <span class="flex h-4 w-4 cursor-help items-center justify-center rounded-full bg-info/15 text-[10px] font-semibold text-info">i</span>
                </Tooltip>
              </span>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- API Configuration -->
  <section class="panel">
    <h3 class="text-lg font-semibold text-ink">API Configuration</h3>
    <div class="mt-4 space-y-4">
      <div class="flex items-center gap-3 text-sm">
        <span class="text-muted">Ingest API Key:</span>
        {#if data.hasApiKey}
          <span class="badge bg-success-light text-success">Configured</span>
        {:else}
          <span class="badge bg-soft text-muted">Not Set</span>
        {/if}
      </div>

      <!-- Test Ingest Button -->
      <div>
        <button
          type="button"
          class="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-dark disabled:opacity-50"
          onclick={testIngest}
          disabled={testingIngest}
        >
          {testingIngest ? 'Testing...' : 'Test Ingest'}
        </button>
        {#if testResult}
          <span
            class="ml-3 text-sm {testResult.success
              ? 'text-success'
              : 'text-danger'}"
          >
            {testResult.message}
          </span>
        {/if}
      </div>
    </div>
  </section>

  <!-- App Settings -->
  <section class="panel">
    <h3 class="text-lg font-semibold text-ink">App Settings</h3>
    {#if settingsState.length > 0}
      <div class="mt-4 overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead>
            <tr class="border-b border-soft">
              <th
                class="px-3 py-3 text-xs font-semibold uppercase tracking-wider text-muted"
                >Key</th
              >
              <th
                class="px-3 py-3 text-xs font-semibold uppercase tracking-wider text-muted"
                >Value</th
              >
              <th
                class="px-3 py-3 text-xs font-semibold uppercase tracking-wider text-muted"
                >Updated</th
              >
              <th
                class="px-3 py-3 text-xs font-semibold uppercase tracking-wider text-muted"
                >Actions</th
              >
            </tr>
          </thead>
          <tbody>
            {#each settingsState as setting, i (setting.key)}
              <tr class="border-b border-soft/50">
                <td class="px-3 py-3 font-mono text-xs">{setting.key}</td>
                <td class="px-3 py-3">
                  {#if readOnlyKeys.includes(setting.key)}
                    <span class="font-mono text-xs text-muted"
                      >{setting.value}</span
                    >
                  {:else if editingKey === setting.key}
                    <input
                      type="text"
                      bind:value={editValue}
                      class="rounded border border-soft bg-canvas px-2 py-1 text-sm font-mono"
                    />
                  {:else}
                    <span class="font-mono text-xs">{setting.value}</span>
                  {/if}
                </td>
                <td class="px-3 py-3"
                  ><DateDisplay date={setting.updatedAt} relative /></td
                >
                <td class="px-3 py-3">
                  {#if readOnlyKeys.includes(setting.key)}
                    <span class="text-xs text-muted">Read-only</span>
                  {:else if editingKey === setting.key}
                    <button
                      class="text-xs text-accent hover:underline"
                      onclick={() => saveSetting(setting.key)}>Save</button
                    >
                    <button
                      class="ml-2 text-xs text-muted hover:underline"
                      onclick={() => (editingKey = null)}>Cancel</button
                    >
                  {:else}
                    <button
                      class="text-xs text-accent hover:underline"
                      onclick={() => startEdit(setting.key, setting.value)}
                      >Edit</button
                    >
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {:else}
      <p class="mt-4 text-sm text-muted">No settings configured.</p>
    {/if}

    <!-- Add New Setting -->
    <div class="mt-4 border-t border-soft pt-4">
      <p class="text-xs font-semibold uppercase tracking-wider text-muted">
        Add Setting
      </p>
      <div class="mt-2 flex items-center gap-2">
        <input
          type="text"
          placeholder="Key"
          bind:value={newKey}
          class="rounded border border-soft bg-canvas px-2 py-1 text-sm font-mono"
        />
        <input
          type="text"
          placeholder="Value"
          bind:value={newValue}
          class="rounded border border-soft bg-canvas px-2 py-1 text-sm font-mono"
        />
        <button
          class="rounded bg-accent px-3 py-1 text-sm font-medium text-white hover:bg-accent-dark disabled:opacity-50"
          onclick={addSetting}
          disabled={!newKey || !newValue}>Add</button
        >
      </div>
    </div>
  </section>

  <!-- Data Retention -->
  <section class="panel">
    <h3 class="text-lg font-semibold text-ink">Data Retention</h3>
    <div class="mt-4 space-y-3 text-sm">
      <div class="grid grid-cols-2 gap-x-8 gap-y-3 md:grid-cols-3">
        <div>
          <p class="text-muted">Raw Artifact Retention</p>
          <p class="font-medium text-ink">{data.retention.rawArtifactDays} days</p>
        </div>
        <div>
          <p class="text-muted">Audit Log Retention</p>
          <p class="font-medium text-ink">{data.retention.auditLogDays} days</p>
        </div>
        <div>
          <p class="text-muted">Last Compaction</p>
          {#if data.lastCompactionAt}
            <p><DateDisplay date={data.lastCompactionAt} relative /></p>
          {:else}
            <p class="text-muted">Never</p>
          {/if}
        </div>
      </div>
      <p class="text-xs text-muted">
        Configure retention via app settings keys:
        <code class="font-mono">retention.raw_artifact_days</code> and
        <code class="font-mono">retention.audit_log_days</code>.
        Run compaction via API: <code class="font-mono">POST /api/v1/maintenance/compact</code>.
      </p>
    </div>
  </section>

  <!-- Export Placeholder -->
  <section class="panel opacity-60">
    <h3 class="text-lg font-semibold text-ink">Export</h3>
    <p class="mt-2 text-sm text-muted">
      Export functionality coming in Phase 9.
    </p>
  </section>
</div>
