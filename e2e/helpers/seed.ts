import { Page } from '@playwright/test';

export async function clearIndexedDB(page: Page) {
  if (page.url() === 'about:blank') {
    await page.goto('/');
  }
  await page.evaluate(() => {
    localStorage.setItem('test_bypass_auth', 'true');
    localStorage.setItem('whats_new_seen_v1_0_17', 'true');
    localStorage.setItem('moneyapp_onboarding', JSON.stringify({
      transactions: true,
      assets: true,
      debts: true,
      settings: true,
      trips: true,
      statistics: true,
      budgets: true,
      'receipt-scanner': true,
      'bulk-input': true
    }));
  });
  await page.reload();
  await page.waitForSelector('#root');
  await page.evaluate(async () => {
    if ((window as any).__dbHelper) {
      await (window as any).__dbHelper.clearAll();
    }
  });
}

export async function seedIndexedDB(
  page: Page,
  storeName: string,
  records: any[]
) {
  await page.waitForSelector('#root');
  await page.evaluate(
    async ({ storeName, records }) => {
      if ((window as any).__dbHelper) {
        await (window as any).__dbHelper.put(storeName, records);
      }
    },
    { storeName, records }
  );
}

export async function seedDefaultData(page: Page) {
  // Clear any existing database
  await clearIndexedDB(page);

  const defaultAssets = [
    { id: 'asset-cash', name: 'Cash', type: 'Cash', initialBalance: 1000000, isDeleted: false, color: '#10b981' },
    { id: 'asset-bca', name: 'BCA', type: 'Bank Account', initialBalance: 5000000, isDeleted: false, color: '#3b82f6' },
  ];

  const defaultCategories = [
    { id: 'cat-makan', name: 'Makan', type: 'pengeluaran', color: '#ef4444', isDeleted: false, subcategories: [] },
    { id: 'cat-transport', name: 'Transportasi', type: 'pengeluaran', color: '#f59e0b', isDeleted: false, subcategories: [] },
    { id: 'cat-gaji', name: 'Gaji', type: 'pendapatan', color: '#10b981', isDeleted: false, subcategories: [] },
  ];

  await seedIndexedDB(page, 'assets', defaultAssets);
  await seedIndexedDB(page, 'categories', defaultCategories);

  // Reload to let app pick up seeded state
  await page.reload();
  await page.waitForSelector('#root');
}
