import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test('loads and displays stat cards', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Dashboard - CreditTimeline/);

    // Heading
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    // Stat cards — the example file has tradelines, searches, etc.
    const main = page.locator('#main-content');
    await expect(main.getByText('Tradelines')).toBeVisible();
    await expect(main.getByText('Searches')).toBeVisible();
    await expect(main.getByText('Addresses')).toBeVisible();
  });

  test('shows debt summary cards', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('Total Balance')).toBeVisible();
    await expect(page.getByText('Credit Limit')).toBeVisible();
    await expect(page.getByText('Open Accounts', { exact: true })).toBeVisible();
    await expect(page.getByText('Utilization')).toBeVisible();
  });

  test('shows recent imports section', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Recent Imports')).toBeVisible();
  });

  test('shows alerts and insights section', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Alerts & Insights')).toBeVisible();
  });

  test('has no console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    expect(errors).toEqual([]);
  });
});
