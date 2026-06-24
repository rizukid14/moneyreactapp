import { test, expect } from '@playwright/test';
import { seedDefaultData } from './helpers/seed';
import { SELECTORS } from './helpers/selectors';

test.describe('Budgets Management', () => {
  test.beforeEach(async ({ page }) => {
    await seedDefaultData(page);
  });

  test('should set category budget limit and view progress', async ({ page }) => {
    await page.click(SELECTORS.navSettings);

    // Turn on budget mode (Envelope or Zero-based)
    const modeToggle = page.locator(SELECTORS.budgetModeToggle);
    await modeToggle.scrollIntoViewIfNeeded();
    await modeToggle.click(); // switch budget mode

    // Go to Budgets management / envelope management
    const manageBtn = page.locator('[data-testid="settings-manage-budget-btn"]');
    await manageBtn.scrollIntoViewIfNeeded();
    await manageBtn.click();

    // Add budget limit
    await page.click('[data-testid="add-category-budget-btn"]');
    await page.selectOption('[data-testid="budget-category-select"]', 'cat-makan');
    await page.fill('[data-testid="budget-limit-input"]', '500000');
    await page.click('[data-testid="budget-submit-btn"]');

    // Assert limit is visible
    await expect(page.locator('text=Makan')).toBeVisible();
    await expect(page.locator('text=500.000')).toBeVisible();
  });
});
