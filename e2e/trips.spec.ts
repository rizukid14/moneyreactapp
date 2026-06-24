import { test, expect } from '@playwright/test';
import { seedDefaultData } from './helpers/seed';
import { SELECTORS } from './helpers/selectors';

test.describe('Trips & Split Bill', () => {
  test.beforeEach(async ({ page }) => {
    await seedDefaultData(page);
  });

  test('should create a new trip and add a trip expense', async ({ page }) => {
    await page.click(SELECTORS.navTrips);

    // 1. Create a trip
    await page.click('[data-testid="trip-add-fab"]');
    await page.fill('[data-testid="trip-modal-name"]', 'Liburan Bali');
    await page.click('[data-testid="trip-modal-submit"]');

    // Verify trip is listed
    await expect(page.locator('text=Liburan Bali')).toBeVisible();

    // 2. Go into trip details
    await page.click('text=Liburan Bali');
    await expect(page.locator('[data-testid="trip-details-title"]')).toContainText('Liburan Bali');

    // Add a trip expense
    await page.click('[data-testid="trip-expense-add-fab"]');
    await page.fill('[data-testid="trip-expense-modal-desc"]', 'Sewa Motor');
    await page.fill('[data-testid="trip-expense-modal-amount"]', '150000');
    await page.click('[data-testid="trip-expense-modal-submit"]');

    // Verify trip expense listed
    await expect(page.locator('text=Sewa Motor')).toBeVisible();
    await expect(page.locator('text=150.000')).toBeVisible();
  });
});
