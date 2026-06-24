import { test, expect } from '@playwright/test';
import { seedDefaultData } from './helpers/seed';
import { SELECTORS } from './helpers/selectors';

test.describe('Navigation & Layout', () => {
  test.beforeEach(async ({ page }) => {
    await seedDefaultData(page);
  });

  test('should navigate between all primary pages', async ({ page }) => {
    // 1. Transactions page is default or reachable
    await page.click(SELECTORS.navTransactions);
    await expect(page.locator('[data-testid="transactions-title"]')).toContainText('Transaksi');

    // 2. Assets page
    await page.click(SELECTORS.navAssets);
    await expect(page.locator('[data-testid="assets-title"]')).toBeVisible();

    // 3. Debts page
    await page.click(SELECTORS.navDebts);
    await expect(page.locator('[data-testid="debts-title"]')).toContainText('Hutang & Piutang');

    // 4. Statistics page
    await page.click(SELECTORS.navStatistics);
    await expect(page.locator('[data-testid="stats-view-all"]')).toBeVisible();

    // 5. Trips page
    await page.click(SELECTORS.navTrips);
    await expect(page.locator('[data-testid="trips-title"]')).toBeVisible();

    // 6. Settings page
    await page.click(SELECTORS.navSettings);
    await expect(page.locator('[data-testid="settings-title"]')).toBeVisible();
  });

  test('should toggle theme between light and dark modes', async ({ page }) => {
    await page.click(SELECTORS.navSettings);
    
    // Toggle theme button
    const themeBtn = page.locator(SELECTORS.themeToggle);
    await expect(themeBtn).toBeVisible();
    await themeBtn.click();

    // Check if the body or root has the theme attribute or dark class
    const htmlElement = page.locator('html');
    await expect(htmlElement).toHaveAttribute('data-theme', 'dark');

    // Toggle back
    await themeBtn.click();
    await expect(htmlElement).toHaveAttribute('data-theme', 'light');
  });
});
