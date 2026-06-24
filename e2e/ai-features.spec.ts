import { test, expect } from '@playwright/test';
import { seedDefaultData } from './helpers/seed';
import { SELECTORS } from './helpers/selectors';
import * as path from 'path';
import * as fs from 'fs';

test.describe('AI Features (Receipt OCR & Bulk Input)', () => {
  test.beforeEach(async ({ page }) => {
    await seedDefaultData(page);
  });

  test('should parse receipt using OCR and save totals', async ({ page }) => {
    // Intercept OCR API call
    await page.route('/api/scan', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          result: {
            merchantName: 'Starbucks Coffee',
            date: '2026-06-02',
            time: '11:00',
            amount: 85000,
            taxAmount: 8500,
            serviceAmount: 0,
            discountAmount: 5000,
            confidence: 'high',
            suggestedCategory: 'Makan',
            suggestedAsset: 'Cash',
            lineItems: [
              { name: 'Cafe Latte', amount: 50000, selected: true, originalAmount: 50000 },
              { name: 'Croissant', amount: 40000, selected: true, originalAmount: 40000 }
            ],
            rawText: 'Starbucks Coffee ... TOTAL 85000'
          }
        })
      });
    });

    // Go to Receipt Scanner
    await page.click(SELECTORS.navTransactions);
    await page.click(SELECTORS.navReceiptScanner);

    // Create a dummy image file for upload
    const dummyFilePath = path.join(__dirname, 'dummy_receipt.png');
    fs.writeFileSync(dummyFilePath, 'dummy image content');

    // Upload file
    await page.setInputFiles(SELECTORS.ocrFileInput, dummyFilePath);

    // Click Scan button (Scan Gambar Penuh)
    await page.click(SELECTORS.runScanBtn);

    // Wait for OCR results page
    await expect(page.locator(SELECTORS.ocrTotalAmount)).toHaveValue('85.000');
    await expect(page.locator(SELECTORS.ocrMerchantInput)).toHaveValue('Starbucks Coffee');

    // Save total transaction
    await page.click(SELECTORS.ocrSaveTotalBtn);

    // Verify it added to transaction list
    await page.click(SELECTORS.navTransactions);
    await expect(page.locator('text=Starbucks Coffee')).toBeVisible();

    // Cleanup dummy file
    try {
      fs.unlinkSync(dummyFilePath);
    } catch {}
  });

  test('should parse bulk natural language input and save transactions', async ({ page }) => {
    // Intercept bulk parsing API
    await page.route('/api/bulk-parse', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          transactions: [
            {
              id: 'tx-bulk-1',
              type: 'pengeluaran',
              amount: 50000,
              date: '2026-06-02',
              note: 'Makan Bakso',
              category: 'Makan',
              asset: 'Cash'
            }
          ]
        })
      });
    });

    // Go to Bulk Input
    await page.click(SELECTORS.navTransactions);
    await page.click(SELECTORS.navBulkInput);

    // Type bulk natural language
    await page.fill(SELECTORS.bulkTextarea, 'Makan Bakso 50rb pake cash tadi');
    await page.click(SELECTORS.bulkParseBtn);

    // Verify bulk results editor displays parsed row
    await expect(page.locator('[data-testid^="bulk-row-note-"]')).toHaveValue('Makan Bakso');

    // Click save
    await page.click(SELECTORS.bulkSaveBtn);

    // Verify it appeared in transaction list
    await page.click(SELECTORS.navTransactions);
    await expect(page.locator('text=Makan Bakso')).toBeVisible();
  });
});
