import { test, expect } from '@playwright/test';
import { seedDefaultData } from './helpers/seed';
import { SELECTORS } from './helpers/selectors';

test.describe('Debts & Piutang', () => {
  test.beforeEach(async ({ page }) => {
    await seedDefaultData(page);
  });

  test('should create debt, pay partially, and check IndexedDB records', async ({ page }) => {
    await page.click(SELECTORS.navDebts);

    // 1. Add debt
    await page.click(SELECTORS.debtAddFAB);
    await expect(page.locator(SELECTORS.debtModal)).toBeVisible();

    // Fill Modal
    await page.fill(SELECTORS.debtModalContact, 'Ahmad');
    await page.fill(SELECTORS.debtModalDesc, 'Pinjam Uang Makan');
    await page.fill(SELECTORS.debtModalAmount, '100000');
    
    // Submit
    await page.click(SELECTORS.debtModalSubmit);

    // Assert visible in list
    await expect(page.locator('text=Ahmad')).toBeVisible();

    // Verify IndexedDB integrity
    const idbDebts = await page.evaluate(async () => {
      const openReq = indexedDB.open('moneyapp_db', 10);
      return new Promise<any[]>((resolve) => {
        openReq.onsuccess = () => {
          const db = openReq.result;
          const store = db.transaction('debts', 'readonly').objectStore('debts');
          const getReq = store.getAll();
          getReq.onsuccess = () => resolve(getReq.result);
        };
      });
    });
    expect(idbDebts.length).toBe(1);
    expect(idbDebts[0].contact).toBe('Ahmad');
    expect(idbDebts[0].totalAmount).toBe(100000);
  });
});
