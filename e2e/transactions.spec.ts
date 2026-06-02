import { test, expect } from '@playwright/test';
import { seedDefaultData } from './helpers/seed';
import { SELECTORS, testId } from './helpers/selectors';

test.describe('Transactions CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    await seedDefaultData(page);
  });

  test('should create expense, view it in list, update it, and delete it', async ({ page }) => {
    await page.click(SELECTORS.navTransactions);

    // 1. Click FAB to add transaction
    await page.click(SELECTORS.txAddFAB);
    await expect(page.locator(SELECTORS.txModal)).toBeVisible();

    // Fill Modal
    await page.fill(SELECTORS.txModalAmount, '50000');
    
    // Choose Category Makan
    await page.click(SELECTORS.txModalCategory);
    await page.click('[data-testid="category-select-item-cat-makan"]');

    // Choose Account Cash
    await page.click(SELECTORS.txModalAsset);
    await page.click('[data-testid="asset-select-item-asset-cash"]');

    // Note/description
    await page.fill('[data-testid="transaction-modal-note"]', 'Makan Siang Enak');

    // Submit
    await page.click(SELECTORS.txModalSubmit);

    // Check it's visible in list
    const itemLocator = page.locator('text=Makan Siang Enak');
    await expect(itemLocator).toBeVisible();

    // Verify IndexedDB integrity
    const idbTransactions = await page.evaluate(async () => {
      const openReq = indexedDB.open('moneyapp_db', 10);
      return new Promise<any[]>((resolve) => {
        openReq.onsuccess = () => {
          const db = openReq.result;
          const store = db.transaction('transactions', 'readonly').objectStore('transactions');
          const getReq = store.getAll();
          getReq.onsuccess = () => resolve(getReq.result);
        };
      });
    });
    expect(idbTransactions.length).toBe(1);
    expect(idbTransactions[0].amount).toBe(50000);
    expect(idbTransactions[0].note).toBe('Makan Siang Enak');

    // 2. Update Transaction
    await page.click('[data-testid^="transaction-item-"]'); // Click first transaction item card
    await expect(page.locator(SELECTORS.txModal)).toBeVisible();
    await page.fill('[data-testid="transaction-modal-note"]', 'Makan Siang Update');
    await page.click(SELECTORS.txModalSubmit);

    await expect(page.locator('text=Makan Siang Update')).toBeVisible();

    // 3. Delete Transaction
    await page.click('[data-testid^="transaction-item-"]');
    await page.click('[data-testid="transaction-modal-delete"]');
    await expect(page.locator('text=Makan Siang Update')).not.toBeVisible();
  });
});
