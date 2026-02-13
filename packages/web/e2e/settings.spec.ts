import { test, expect } from '@playwright/test';

test.describe('Settings', () => {
  test('page loads with heading', async ({ page }) => {
    await page.goto('/settings');
    await expect(page).toHaveTitle(/Settings - CreditTimeline/);
    await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
  });

  test('shows System Health section', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByText('System Health')).toBeVisible();
    await expect(page.getByText('Total Records')).toBeVisible();
    await expect(page.getByText('DB Engine')).toBeVisible();
    await expect(page.getByText('Schema Hash')).toBeVisible();
  });

  test('shows Database section with engine info', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'Database' })).toBeVisible();
    await expect(page.getByText('Engine', { exact: true })).toBeVisible();
    await expect(page.getByText('Schema Version')).toBeVisible();
    await expect(page.getByText('Last Ingest')).toBeVisible();
  });

  test('shows Table Row Counts', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByText('Table Row Counts')).toBeVisible();
  });

  test('shows App Settings table', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'App Settings' })).toBeVisible();
    // Should have at least the ddl_hash setting
    await expect(page.getByText('ddl_hash')).toBeVisible();
  });

  test('shows API Configuration section', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByText('API Configuration')).toBeVisible();
    await expect(page.getByText('Test Ingest')).toBeVisible();
  });

  test('shows Data Retention section', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'Data Retention' })).toBeVisible();
    await expect(page.getByText('Raw Artifact Retention')).toBeVisible();
    await expect(page.getByText('Audit Log Retention')).toBeVisible();
  });
});
