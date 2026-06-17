import { test, expect } from './extension-fixture';

test.describe('SPA Navigation and Scraper Detection', () => {
  test('sidebar dynamically updates metadata when user navigates between problems', async ({ page, context }) => {
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

    // 2. Mock Notion API query for both problems to return no existing records
    await context.route(/https:\/\/api\.notion\.com\/v1\/databases\/.*\/query$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ object: 'list', results: [] })
      });
    });

    // 3. Mock LeetCode problem page DOM for Two Sum
    await page.route('https://leetcode.com/problems/two-sum/', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `
          <!DOCTYPE html>
          <html>
          <head><title>1. Two Sum - LeetCode</title></head>
          <body>
            <div data-cy="question-title">1. Two Sum</div>
            <div class="text-difficulty-easy">Easy</div>
            <div class="flex flex-wrap"><a href="/tag/array/">Array</a></div>
            <div class="text-sd-foreground">53.2%</div>
            <div class="ant-select-selection-item">Python3</div>
            <textarea class="inputarea">print("Two Sum")</textarea>
          </body>
          </html>
        `
      });
    });

    // 4. Navigate to Two Sum and open sidebar
    await page.goto('https://leetcode.com/problems/two-sum/');
    await page.keyboard.press('Control+Shift+N');

    const sidebarHead = page.locator('.sb-head');
    await expect(sidebarHead).toContainText('Two Sum #1');
    await expect(sidebarHead).toContainText('Easy');

    // 5. Simulate Single Page Application (SPA) navigation inside LeetCode
    // Update the DOM first, then push state to trigger the observer
    await page.evaluate(() => {
      // Update DOM elements to represent the new problem (Add Two Numbers)
      const titleEl = document.querySelector('[data-cy="question-title"]');
      if (titleEl) titleEl.textContent = '2. Add Two Numbers';

      const diffEl = document.querySelector('.text-difficulty-easy');
      if (diffEl) {
        diffEl.textContent = 'Medium';
        diffEl.className = 'text-difficulty-medium';
      }

      const codeArea = document.querySelector('textarea.inputarea') as HTMLTextAreaElement;
      if (codeArea) codeArea.value = 'print("Add Two Numbers")';

      // Push history state to simulate route transition
      window.history.pushState({}, '', '/problems/add-two-numbers/');
    });

    // 6. Verify that the sidebar detects the transition, re-scrapes, and displays the new metadata
    await expect(sidebarHead).toContainText('Add Two Numbers #2');
    await expect(sidebarHead).toContainText('Medium');
  });
});
