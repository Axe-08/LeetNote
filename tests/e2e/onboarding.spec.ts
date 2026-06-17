import { test, expect } from './extension-fixture';
import { setupNotionMocks } from './notion-mock-helper';

test.describe('Extension Onboarding Wizard', () => {
  test('successfully completes onboarding flow via offline mock connection', async ({ page, context, extensionId }) => {
    // 1. Setup mocks for Notion API calls during onboarding
    await setupNotionMocks(context);

    // 2. Open popup in a full page tab
    await page.goto(`chrome-extension://${extensionId}/popup.html`);

    // --- Step 1: Welcome Screen ---
    await expect(page.locator('.ob-title')).toHaveText('Welcome to LeetNote');
    const getStartedBtn = page.locator('button:has-text("Get Started")');
    await expect(getStartedBtn).toBeVisible();
    await getStartedBtn.click();

    // --- Step 2: Notion Connect Screen ---
    await expect(page.locator('.ob-title')).toHaveText('Connect Notion Workspace');
    const sandboxConnectBtn = page.locator('button:has-text("Sandbox Connect")');
    await expect(sandboxConnectBtn).toBeVisible();
    await sandboxConnectBtn.click();

    // --- Step 3: Database Setup Screen ---
    await expect(page.locator('.ob-title')).toHaveText('Notion Database Setup');
    // Verify databases option and pages dropdown loaded
    const useSelectedDbBtn = page.locator('button:has-text("Use Selected Database")');
    await expect(useSelectedDbBtn).toBeVisible();
    await useSelectedDbBtn.click();

    // --- Step 4: Preferences Screen ---
    await expect(page.locator('.ob-title')).toHaveText('Preferences');
    const savePrefsBtn = page.locator('button:has-text("Save Preferences")');
    await expect(savePrefsBtn).toBeVisible();
    await savePrefsBtn.click();

    // --- Step 5: Test Save Screen ---
    await expect(page.locator('.ob-title')).toHaveText('LeetNote is Ready!');
    const skipToDashboardBtn = page.locator('button:has-text("Skip & Go to Dashboard")');
    await expect(skipToDashboardBtn).toBeVisible();
    await skipToDashboardBtn.click();

    // --- Final: Verify Dashboard State ---
    // The main dashboard should load after finishing onboarding
    await expect(page.locator('.pop-logo')).toHaveText('LEETNOTE');
    await expect(page.locator('.pop-status.connected')).toBeVisible();
    await expect(page.locator('button:has-text("Open LeetCode")')).toBeVisible();
  });
});
