# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: transactions.spec.ts >> Transactions CRUD Operations >> should create expense, view it in list, update it, and delete it
- Location: e2e\transactions.spec.ts:10:3

# Error details

```
Error: expect(locator).not.toBeVisible() failed

Locator:  locator('text=Makan Siang Update')
Expected: not visible
Received: visible
Timeout:  5000ms

Call log:
  - Expect "not toBeVisible" with timeout 5000ms
  - waiting for locator('text=Makan Siang Update')
    14 × locator resolved to <span class="ml-1.5 opacity-80 truncate max-w-[120px]">• Makan Siang Update</span>
       - unexpected value "visible"

```

```yaml
- text: • Makan Siang Update
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { seedDefaultData } from './helpers/seed';
  3  | import { SELECTORS, testId } from './helpers/selectors';
  4  | 
  5  | test.describe('Transactions CRUD Operations', () => {
  6  |   test.beforeEach(async ({ page }) => {
  7  |     await seedDefaultData(page);
  8  |   });
  9  | 
  10 |   test('should create expense, view it in list, update it, and delete it', async ({ page }) => {
  11 |     await page.click(SELECTORS.navTransactions);
  12 | 
  13 |     // 1. Click FAB to add transaction
  14 |     await page.click(SELECTORS.txAddFAB);
  15 |     await expect(page.locator(SELECTORS.txModal)).toBeVisible();
  16 | 
  17 |     // Fill Modal
  18 |     await page.fill(SELECTORS.txModalAmount, '50000');
  19 |     
  20 |     // Choose Category Makan
  21 |     await page.click(SELECTORS.txModalCategory);
  22 |     await page.click('[data-testid="category-select-item-cat-makan"]');
  23 | 
  24 |     // Choose Account Cash
  25 |     await page.click(SELECTORS.txModalAsset);
  26 |     await page.click('[data-testid="asset-type-tab-Cash"]');
  27 |     await page.click('[data-testid="asset-select-item-asset-cash"]');
  28 | 
  29 |     // Note/description
  30 |     await page.fill('[data-testid="tx-note-input"]', 'Makan Siang Enak');
  31 | 
  32 |     // Submit
  33 |     await page.click(SELECTORS.txModalSubmit);
  34 | 
  35 |     // Check it's visible in list
  36 |     const itemLocator = page.locator('text=Makan Siang Enak');
  37 |     await expect(itemLocator).toBeVisible();
  38 | 
  39 |     // Verify IndexedDB integrity
  40 |     const idbTransactions = await page.evaluate(async () => {
  41 |       const openReq = indexedDB.open('moneyapp_db', 10);
  42 |       return new Promise<any[]>((resolve) => {
  43 |         openReq.onsuccess = () => {
  44 |           const db = openReq.result;
  45 |           const store = db.transaction('transactions', 'readonly').objectStore('transactions');
  46 |           const getReq = store.getAll();
  47 |           getReq.onsuccess = () => resolve(getReq.result);
  48 |         };
  49 |       });
  50 |     });
  51 |     expect(idbTransactions.length).toBe(1);
  52 |     expect(idbTransactions[0].amount).toBe(50000);
  53 |     expect(idbTransactions[0].note).toBe('Makan Siang Enak');
  54 | 
  55 |     // 2. Update Transaction
  56 |     await page.click('[data-testid^="transaction-item-"]'); // Click first transaction item card
  57 |     await expect(page.locator(SELECTORS.txModal)).toBeVisible();
  58 |     await page.fill('[data-testid="tx-note-input"]', 'Makan Siang Update');
  59 |     await page.click(SELECTORS.txModalSubmit);
  60 | 
  61 |     await expect(page.locator('text=Makan Siang Update')).toBeVisible();
  62 | 
  63 |     // 3. Delete Transaction
  64 |     await page.click('[data-testid^="transaction-item-"]');
  65 |     await page.click('[data-testid="tx-delete-btn"]');
> 66 |     await expect(page.locator('text=Makan Siang Update')).not.toBeVisible();
     |                                                               ^ Error: expect(locator).not.toBeVisible() failed
  67 |   });
  68 | });
  69 | 
```