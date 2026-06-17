import { test, expect } from './extension-fixture';

test.describe('Sidebar UI and Hotkeys', () => {
  test('opens sidebar, captures content, persists notes state', async ({ page, context, extensionId }) => {
    // 1. Pre-configure storage so that Notion connection is already completed
    const [worker] = context.serviceWorkers();
    await worker.evaluate(async () => {
      await chrome.storage.local.set({
        'auth.notion_token_enc': 'mock-encrypted-token',
        'auth.database_id': 'mock-database-id',
        'settings.spaced_rep': true,
        'settings.clipping': true
      });
    });

    // 2. Mock LeetCode problem page DOM structure
    await page.route('https://leetcode.com/problems/two-sum/', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `
          <!DOCTYPE html>
          <html>
          <head>
            <title>1. Two Sum - LeetCode</title>
          </head>
          <body>
            <div data-cy="question-title">1. Two Sum</div>
            <div class="text-difficulty-easy">Easy</div>
            <div class="flex flex-wrap">
              <a class="mr-1" href="/tag/array/">Array</a>
              <a class="mr-1" href="/tag/hash-table/">Hash Table</a>
            </div>
            <div class="text-sd-foreground">Acceptance Rate 53.2%</div>
            <div class="ant-select-selection-item">Python3</div>
            <textarea class="inputarea">def twoSum(nums, target):
    return [0, 1]</textarea>
          </body>
          </html>
        `
      });
    });

    // 3. Navigate to the problem page
    await page.goto('https://leetcode.com/problems/two-sum/');

    // 4. Verify trigger button is injected and visible
    const trigger = page.locator('#leetnote-sidebar-trigger');
    await expect(trigger).toBeVisible();

    // 5. Open sidebar using keyboard shortcut (Ctrl+Shift+N)
    await page.keyboard.press('Control+Shift+N');

    // 6. Check that the sidebar host is visible and open
    const sidebarHost = page.locator('#leetnote-sidebar-host');
    await expect(sidebarHost).toBeVisible();

    // 7. Verify we can fill in notes inside the open Shadow DOM
    const notesArea = page.locator('textarea.nb-area');
    await expect(notesArea).toBeVisible();
    await notesArea.fill('Solve using hashmap for complement O(n).');

    // 8. Capture code from mock editor
    const captureBtn = page.locator('button.cap-btn');
    await captureBtn.click();
    
    // Check that code was successfully extracted and displayed
    const codeContainer = page.locator('.code-lines.has-code');
    await expect(codeContainer).toContainText('def twoSum(nums, target)');

    // 9. Rate confidence as 4 (Good)
    const starBtn = page.locator('button.cnode').nth(3); // 4th button
    await starBtn.click();
    
    const confidenceText = page.locator('span.conf-lbl');
    await expect(confidenceText).toContainText('Good — review in 14 days');

    // 10. Close sidebar using Escape key
    await page.keyboard.press('Escape');
    
    // The width should animate to 0px
    await expect(sidebarHost).toHaveStyle({ width: '0px' });

    // 11. Reopen and verify that the notes draft is preserved
    await page.keyboard.press('Control+Shift+N');
    await expect(notesArea).toHaveValue('Solve using hashmap for complement O(n).');
  });
});
