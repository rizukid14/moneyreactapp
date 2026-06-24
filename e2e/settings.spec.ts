import { test, expect } from '@playwright/test';
import { seedDefaultData } from './helpers/seed';
import { SELECTORS } from './helpers/selectors';

test.describe('Settings & Preferences', () => {
  test.beforeEach(async ({ page }) => {
    await seedDefaultData(page);
  });

  test('should update start of month day and currency symbol', async ({ page }) => {
    await page.click(SELECTORS.navSettings);

    // Edit start of month
    await page.fill('[data-testid="settings-start-of-month"]', '5');

    // Edit currency symbol
    await page.fill(SELECTORS.currencyInput, 'USD');

    // Reload and check if it persisted
    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(page.locator('[data-testid="settings-start-of-month"]')).toHaveValue('5');
    await expect(page.locator(SELECTORS.currencyInput)).toHaveValue('USD');
  });
});
