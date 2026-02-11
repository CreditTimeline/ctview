<script lang="ts">
  import '@fontsource-variable/inter';
  import '@fontsource-variable/jetbrains-mono';
  import '../app.css';
  import { page } from '$app/stores';

  const navItems = [
    { href: '/', label: 'Dashboard' },
    { href: '/tradelines', label: 'Tradelines' },
    { href: '/searches', label: 'Searches' },
    { href: '/scores', label: 'Scores' },
    { href: '/addresses', label: 'Addresses' },
    { href: '/public-records', label: 'Public Records' },
    { href: '/imports', label: 'Imports' },
  ];

  function isActive(href: string, pathname: string): boolean {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  let { children } = $props();
</script>

<div class="flex h-screen bg-canvas">
  <!-- Sidebar -->
  <aside class="flex w-64 flex-col border-r border-soft bg-surface">
    <div class="border-b border-soft p-6">
      <h1 class="text-xl font-bold text-ink">CreditTimeline</h1>
      <p class="mt-1 text-sm text-muted">Personal Credit Vault</p>
    </div>
    <nav class="flex-1 space-y-1 p-4">
      {#each navItems as item (item.href)}
        {@const active = isActive(item.href, $page.url.pathname)}
        <a
          href={item.href}
          class="flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors
            {active
            ? 'bg-accent-light text-accent-dark'
            : 'text-ink hover:bg-soft/50 hover:text-ink'}"
        >
          {item.label}
        </a>
      {/each}
    </nav>
    <div class="border-t border-soft p-4">
      <p class="text-xs text-muted">CreditTimeline v0.1.0</p>
    </div>
  </aside>

  <!-- Main content -->
  <main class="flex-1 overflow-y-auto">
    <div class="p-8">
      {@render children()}
    </div>
  </main>
</div>
