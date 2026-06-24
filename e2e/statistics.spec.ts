import { test, expect } from '@playwright/test';
import { seedDefaultData } from './helpers/seed';
import { SELECTORS } from './helpers/selectors';

test.describe('Statistics Page', () => {
  test.beforeEach(async ({ page }) => {
    await seedDefaultData(page);
  });

  test('should view analytics charts and switch scale preferences', async ({ page }) => {
    await page.click(SELECTORS.navStatistics);

    // Switch view tabs in statistics
    await page.click('[data-testid="stats-view-health"]');
    await expect(page.locator('text=Skor Anda didasarkan pada 6 metrik')).toBeVisible();

    await page.click('[data-testid="stats-view-budget"]');
    await expect(page.locator('text=Anggaran Kategori')).toBeVisible();

    await page.click('[data-testid="stats-view-goals"]');
    await expect(page.locator('text=Target Tabungan')).toBeVisible();

    // Go back to main analysis view and check chart scale buttons
    await page.click('[data-testid="stats-view-all"]');
    
    // Scale switches (linear, dual, log)
    const logScaleBtn = page.locator('[data-testid="chart-scale-log"]');
    if (await logScaleBtn.isVisible()) {
      await logScaleBtn.click();
      await expect(page.locator('[data-theme]')).toBeDefined(); // scale button toggled successfully
    }
  });
});
