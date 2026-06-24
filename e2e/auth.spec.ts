import { test, expect } from '@playwright/test';
import { signUpNewUser, signInUser } from './helpers/auth';
import { SELECTORS } from './helpers/selectors';
import { clearIndexedDB } from './helpers/seed';

test.describe('Firebase Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Clear IndexedDB to ensure clean state
    await clearIndexedDB(page);
    await page.evaluate(() => {
      localStorage.removeItem('test_bypass_auth');
    });
    await page.reload();
    await page.waitForSelector('#root');
  });

  test('should fail to sign in with non-existent user and show error', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Fill credentials
    await page.fill(SELECTORS.authEmail, 'invalid-nonexistent-user-12345@example.com');
    await page.fill(SELECTORS.authPassword, 'password123');
    await page.click(SELECTORS.authSubmitBtn);

    // Assert error message is displayed
    const errorEl = page.locator(SELECTORS.authErrorMsg);
    await expect(errorEl).toBeVisible({ timeout: 10000 });
    const text = await errorEl.textContent();
    expect(text).toContain('INVALID_LOGIN_CREDENTIALS');
  });

  test('should successfully sign up a new user, sign out, and sign back in', async ({ page }) => {
    const testEmail = `moneyapp_test_${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';

    // 1. Sign Up
    await signUpNewUser(page, testEmail, testPassword);
    
    // Verify dashboard/sidebar shows up indicating successful login
    await expect(page.locator(SELECTORS.navTransactions)).toBeVisible();

    // 2. Sign Out via Settings page
    await page.click(SELECTORS.navSettings);
    await page.waitForLoadState('networkidle');

    // Find and click Logout button
    const logoutBtn = page.locator('[data-testid="logout-btn"]');
    await logoutBtn.scrollIntoViewIfNeeded();
    await logoutBtn.click();

    // Verify back to auth screen
    await expect(page.locator(SELECTORS.authEmail)).toBeVisible();

    // 3. Sign In
    await signInUser(page, testEmail, testPassword);
    await expect(page.locator(SELECTORS.navTransactions)).toBeVisible();
  });
});
