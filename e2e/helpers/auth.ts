import { Page, expect } from '@playwright/test';
import { SELECTORS } from './selectors';

export async function signUpNewUser(page: Page, email: string, password: string) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Toggle to Sign Up mode
  const toggleBtn = page.locator(SELECTORS.authToggleBtn);
  if (await toggleBtn.isVisible()) {
    const text = await toggleBtn.textContent();
    if (text && text.includes('Daftar')) {
      await toggleBtn.click();
    }
  }

  // Fill credentials
  await page.fill(SELECTORS.authEmail, email);
  await page.fill(SELECTORS.authPassword, password);
  
  // Submit
  await page.click(SELECTORS.authSignUpBtn);

  // Wait for post-login view (such as nav bar or dashboard screen)
  await page.waitForSelector(SELECTORS.navTransactions, { timeout: 15000 });
}

export async function signInUser(page: Page, email: string, password: string) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Ensure in Sign In mode
  const toggleBtn = page.locator(SELECTORS.authToggleBtn);
  if (await toggleBtn.isVisible()) {
    const text = await toggleBtn.textContent();
    if (text && text.includes('Masuk')) {
      await toggleBtn.click();
    }
  }

  // Fill credentials
  await page.fill(SELECTORS.authEmail, email);
  await page.fill(SELECTORS.authPassword, password);

  // Submit
  await page.click(SELECTORS.authSubmitBtn);

  // Wait for post-login view
  await page.waitForSelector(SELECTORS.navTransactions, { timeout: 15000 });
}
