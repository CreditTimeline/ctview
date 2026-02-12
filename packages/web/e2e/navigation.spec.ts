import { test, expect } from '@playwright/test';

const navRoutes = [
  { href: '/', label: 'Dashboard', title: /Dashboard/ },
  { href: '/tradelines', label: 'Tradelines', title: /Tradelines/ },
  { href: '/searches', label: 'Searches', title: /Searches/ },
  { href: '/scores', label: 'Scores', title: /Scores/ },
  { href: '/addresses', label: 'Addresses', title: /Addresses/ },
  { href: '/public-records', label: 'Public Records', title: /Public Records/ },
  { href: '/imports', label: 'Imports', title: /Imports/ },
  { href: '/settings', label: 'Settings', title: /Settings/ },
];

test.describe('Navigation (Desktop)', () => {
  for (const route of navRoutes) {
    test(`sidebar link to ${route.label} works`, async ({ page }) => {
      await page.goto('/');
      const nav = page.locator('nav[aria-label="Main"]');
      await nav.getByRole('link', { name: route.label }).click();
      await expect(page).toHaveURL(route.href);
      await expect(page).toHaveTitle(route.title);
    });
  }

  test('non-existent page shows error', async ({ page }) => {
    await page.goto('/this-page-does-not-exist');
    await expect(page.getByText('404')).toBeVisible();
    await expect(page.getByText('Page Not Found')).toBeVisible();
    // "Back to Dashboard" link
    await expect(page.getByRole('link', { name: 'Back to Dashboard' })).toBeVisible();
  });

  test('sidebar shows branding', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('CreditTimeline')).toBeVisible();
    await expect(page.getByText('Personal Credit Vault')).toBeVisible();
  });
});

test.describe('Navigation (Mobile)', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('hamburger menu toggles sidebar', async ({ page }) => {
    await page.goto('/');

    // Sidebar should be hidden initially on mobile
    const sidebar = page.locator('aside');
    await expect(sidebar).toHaveClass(/-translate-x-full/);

    // Open hamburger menu
    const openButton = page.getByRole('button', { name: 'Open navigation menu' });
    await expect(openButton).toBeVisible();
    await openButton.click();

    // Sidebar should now be visible
    await expect(sidebar).toHaveClass(/translate-x-0/);

    // Navigate via sidebar
    const nav = page.locator('nav[aria-label="Main"]');
    await nav.getByRole('link', { name: 'Tradelines' }).click();
    await expect(page).toHaveURL('/tradelines');

    // Sidebar should close after navigation
    await expect(sidebar).toHaveClass(/-translate-x-full/);
  });

  test('close button closes sidebar', async ({ page }) => {
    await page.goto('/');

    const sidebar = page.locator('aside');
    const openButton = page.getByRole('button', { name: 'Open navigation menu' });
    await openButton.click();
    await expect(sidebar).toHaveClass(/translate-x-0/);

    const closeButton = page.getByRole('button', { name: 'Close navigation menu' });
    await closeButton.click();
    await expect(sidebar).toHaveClass(/-translate-x-full/);
  });
});
