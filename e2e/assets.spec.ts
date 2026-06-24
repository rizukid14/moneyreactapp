import { test, expect } from '@playwright/test';
import { seedDefaultData } from './helpers/seed';
import { SELECTORS } from './helpers/selectors';

test.describe('Assets CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    await seedDefaultData(page);
  });

  test('should create a new asset, view card, and check IndexedDB balance', async ({ page }) => {
    await page.click(SELECTORS.navAssets);

    // 1. Click Add Asset button
    await page.click(SELECTORS.assetAddBtn);
    await expect(page.locator(SELECTORS.assetModal)).toBeVisible();

    // Fill Asset details
    await page.fill(SELECTORS.assetModalName, 'Gopay Test');
    await page.selectOption(SELECTORS.assetModalType, 'eWallet');
    await page.fill(SELECTORS.assetModalBalance, '250000');
    
    // Submit
    await page.click(SELECTORS.assetModalSubmit);

    // Check it's visible in list
    await expect(page.locator('text=Gopay Test')).toBeVisible();

    // Verify IndexedDB integrity
    const idbAssets = await page.evaluate(async () => {
      const openReq = indexedDB.open('moneyapp_db', 10);
      return new Promise<any[]>((resolve) => {
        openReq.onsuccess = () => {
          const db = openReq.result;
          const store = db.transaction('assets', 'readonly').objectStore('assets');
          const getReq = store.getAll();
          getReq.onsuccess = () => resolve(getReq.result);
        };
      });
    });

    const gopayAsset = idbAssets.find(a => a.name === 'Gopay Test');
    expect(gopayAsset).toBeDefined();
    expect(gopayAsset.initialBalance).toBe(250000);
    expect(gopayAsset.type).toBe('eWallet');
  });
});
