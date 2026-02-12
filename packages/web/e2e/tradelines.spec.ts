import { test, expect } from '@playwright/test';

test.describe('Tradelines', () => {
  test('list page loads with tradeline rows', async ({ page }) => {
    await page.goto('/tradelines');
    await expect(page).toHaveTitle(/Tradelines - CreditTimeline/);
    await expect(page.getByRole('heading', { name: 'Tradelines' })).toBeVisible();

    // Table should have at least one row (from the ingested example file)
    const rows = page.locator('table tbody tr');
    await expect(rows.first()).toBeVisible();
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test('shows result count', async ({ page }) => {
    await page.goto('/tradelines');
    // The page shows "N result(s)"
    await expect(page.getByText(/\d+ results?/)).toBeVisible();
  });

  test('has a search input', async ({ page }) => {
    await page.goto('/tradelines');
    const searchInput = page.getByPlaceholder('Search tradelines');
    await expect(searchInput).toBeVisible();
  });

  test('clicking a tradeline navigates to detail', async ({ page }) => {
    await page.goto('/tradelines');

    // Click on the first tradeline link in the table
    const firstLink = page.locator('table tbody tr a').first();
    await expect(firstLink).toBeVisible();
    await firstLink.click();

    // Should navigate to a detail page with tradeline info
    await expect(page.url()).toContain('/tradelines/');
    await expect(page.getByText('All Tradelines')).toBeVisible();
  });

  test('detail page shows account information', async ({ page }) => {
    await page.goto('/tradelines');

    const firstLink = page.locator('table tbody tr a').first();
    await firstLink.click();

    // Detail page should show key sections
    await expect(page.getByText('Latest Balance')).toBeVisible();
    await expect(page.getByText('Snapshots')).toBeVisible();
  });
});
