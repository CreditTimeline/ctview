<script lang="ts">
  let dragOver = $state(false);
  let uploading = $state(false);
  let result = $state<{ success: boolean; message: string } | null>(null);
  let fileInput: HTMLInputElement;

  async function handleFile(file: File) {
    if (!file.name.endsWith('.json')) {
      result = { success: false, message: 'Only .json files are accepted.' };
      return;
    }
    uploading = true;
    result = null;

    try {
      const text = await file.text();
      // Validate it's actually JSON
      JSON.parse(text);

      const res = await fetch('/api/v1/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: text,
      });

      const data = await res.json();
      if (res.ok) {
        result = { success: true, message: 'File ingested successfully.' };
      } else {
        result = { success: false, message: data.error?.message ?? 'Ingestion failed.' };
      }
    } catch (e) {
      result = {
        success: false,
        message: e instanceof SyntaxError ? 'Invalid JSON file.' : 'Upload failed.',
      };
    } finally {
      uploading = false;
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    dragOver = false;
    const file = e.dataTransfer?.files[0];
    if (file) handleFile(file);
  }

  function onDragOver(e: DragEvent) {
    e.preventDefault();
    dragOver = true;
  }

  function onDragLeave() {
    dragOver = false;
  }

  function onFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) handleFile(file);
  }
</script>

<div
  class="panel border-2 border-dashed text-center transition-colors {dragOver
    ? 'border-accent bg-accent-light'
    : 'border-soft'}"
  ondrop={onDrop}
  ondragover={onDragOver}
  ondragleave={onDragLeave}
  role="button"
  tabindex="0"
>
  <div class="py-8">
    <p class="text-ink text-lg font-medium">
      {uploading ? 'Uploading...' : 'Drop a CreditTimeline file here'}
    </p>
    <p class="text-muted mt-1 text-sm">
      Upload a normalised JSON file produced by a CreditTimeline tool. ctview stores, visualises and
      analyses your credit data.
    </p>
    <button
      type="button"
      class="bg-accent hover:bg-accent-dark mt-4 rounded-lg px-4 py-2 text-sm font-medium text-white"
      onclick={() => fileInput.click()}
      disabled={uploading}
    >
      Choose File
    </button>
    <input
      bind:this={fileInput}
      type="file"
      accept=".json"
      class="hidden"
      onchange={onFileSelect}
    />
    <p class="text-muted mt-3 text-xs">
      Need a file? Find conversion tools at
      <a
        href="https://github.com/CreditTimeline"
        target="_blank"
        rel="noopener noreferrer"
        class="text-accent hover:underline">CreditTimeline on GitHub</a
      >.
    </p>
  </div>

  {#if result}
    <div
      class="mt-4 rounded-lg p-3 text-sm {result.success
        ? 'bg-success-light text-success'
        : 'bg-danger-light text-danger'}"
    >
      {result.message}
    </div>
  {/if}
</div>
