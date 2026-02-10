<script lang="ts">
  import '../app.css';

  const navItems = [
    { href: '/', label: 'Dashboard', icon: 'home' },
    { href: '/tradelines', label: 'Tradelines', icon: 'credit-card' },
    { href: '/searches', label: 'Searches', icon: 'search' },
    { href: '/scores', label: 'Scores', icon: 'trending-up' },
    { href: '/addresses', label: 'Addresses', icon: 'map-pin' },
    { href: '/public-records', label: 'Public Records', icon: 'file-text' },
    { href: '/imports', label: 'Imports', icon: 'download' },
  ];

  let { children } = $props();
</script>

<div class="flex h-screen bg-gray-50">
  <!-- Sidebar -->
  <aside class="flex w-64 flex-col border-r border-gray-200 bg-white">
    <div class="border-b border-gray-200 p-6">
      <h1 class="text-xl font-bold text-gray-900">CreditTimeline</h1>
      <p class="mt-1 text-sm text-gray-500">Personal Credit Vault</p>
    </div>
    <nav class="flex-1 space-y-1 p-4">
      {#each navItems as item (item.href)}
        <a
          href={item.href}
          class="flex items-center rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900"
        >
          {item.label}
        </a>
      {/each}
    </nav>
    <div class="border-t border-gray-200 p-4">
      <p class="text-xs text-gray-400">CreditTimeline v0.1.0</p>
    </div>
  </aside>

  <!-- Main content -->
  <main class="flex-1 overflow-y-auto">
    <div class="p-8">
      {@render children()}
    </div>
  </main>
</div>
