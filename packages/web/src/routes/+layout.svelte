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
    { href: '/settings', label: 'Settings' },
  ];

  function isActive(href: string, pathname: string): boolean {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  let { children } = $props();

  let sidebarOpen = $state(false);

  // Close sidebar on navigation
  $effect(() => {
    void $page.url.pathname;
    sidebarOpen = false;
  });

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && sidebarOpen) {
      sidebarOpen = false;
    }
  }

  // Focus trap for mobile sidebar
  function trapFocus(node: HTMLElement, active: boolean) {
    let isActive = active;

    function handleTab(e: KeyboardEvent) {
      if (!isActive || e.key !== 'Tab') return;
      const focusable = node.querySelectorAll<HTMLElement>(
        'a[href], button, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    function focusFirst() {
      const el = node.querySelector<HTMLElement>(
        'a[href], button, [tabindex]:not([tabindex="-1"])',
      );
      el?.focus();
    }

    node.addEventListener('keydown', handleTab);
    if (isActive) focusFirst();

    return {
      update(newActive: boolean) {
        isActive = newActive;
        if (isActive) focusFirst();
      },
      destroy() {
        node.removeEventListener('keydown', handleTab);
      },
    };
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<a
  href="#main-content"
  class="focus:bg-accent sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:px-4 focus:py-2 focus:text-white"
>
  Skip to content
</a>

<div class="bg-canvas flex h-screen">
  <!-- Mobile top bar -->
  <div
    class="border-soft bg-surface fixed top-0 right-0 left-0 z-30 flex items-center border-b px-4 py-3 md:hidden"
  >
    <button
      onclick={() => (sidebarOpen = true)}
      class="text-ink hover:bg-soft/50 rounded-lg p-1"
      aria-label="Open navigation menu"
    >
      <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M4 6h16M4 12h16M4 18h16"
        />
      </svg>
    </button>
    <h1 class="text-ink ml-3 text-lg font-bold">CreditTimeline</h1>
  </div>

  <!-- Mobile sidebar backdrop -->
  {#if sidebarOpen}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="fixed inset-0 z-40 bg-black/30 md:hidden"
      onclick={() => (sidebarOpen = false)}
      onkeydown={(e) => e.key === 'Escape' && (sidebarOpen = false)}
    ></div>
  {/if}

  <!-- Sidebar -->
  <aside
    class="border-soft bg-surface fixed z-50 flex h-full w-64 flex-col border-r transition-transform duration-200
      {sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      md:static md:translate-x-0"
    use:trapFocus={sidebarOpen}
  >
    <div class="border-soft flex items-center justify-between border-b p-6">
      <div>
        <h1 class="text-ink text-xl font-bold">CreditTimeline</h1>
        <p class="text-muted mt-1 text-sm">Personal Credit Vault</p>
      </div>
      <button
        class="text-ink hover:bg-soft/50 rounded-lg p-1 md:hidden"
        onclick={() => (sidebarOpen = false)}
        aria-label="Close navigation menu"
      >
        <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
    <nav class="flex-1 space-y-1 p-4" aria-label="Main">
      {#each navItems as item (item.href)}
        {@const active = isActive(item.href, $page.url.pathname)}
        <a
          href={item.href}
          data-sveltekit-preload-data="hover"
          class="flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors
            {active
            ? 'bg-accent-light text-accent-dark'
            : 'text-ink hover:bg-soft/50 hover:text-ink'}"
        >
          {item.label}
        </a>
      {/each}
    </nav>
    <div class="border-soft border-t p-4">
      <p class="text-muted text-xs">CreditTimeline v0.1.0</p>
    </div>
  </aside>

  <!-- Main content -->
  <main id="main-content" class="flex-1 overflow-y-auto pt-14 md:pt-0">
    <div class="p-4 md:p-8">
      {@render children()}
    </div>
  </main>
</div>
