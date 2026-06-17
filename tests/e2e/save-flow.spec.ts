import { test, expect } from './extension-fixture';
import { setupNotionMocks } from './notion-mock-helper';

test.describe('Notion Save Flow and Queue Manager', () => {
  test.beforeEach(async ({ context }) => {
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
  });

  test('successfully saves new attempt to Notion and transitions button state', async ({ page, context }) => {
    // 2. Setup mock responses for Notion API
    await setupNotionMocks(context);

    // 3. Mock LeetCode problem page DOM
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
            <textarea class="inputarea">print("Hello World")</textarea>
          </body>
          </html>
        `
      });
    });

    await page.goto('https://leetcode.com/problems/two-sum/');

    // 4. Toggle sidebar
    await page.keyboard.press('Control+Shift+N');

    // 5. Fill notes & capture code
    await page.locator('textarea.nb-area').fill('HashMap implementation.');
    await page.locator('button.cap-btn').click();

    // 6. Select confidence
    await page.locator('button.cnode').nth(3).click();

    // 7. Click save
    const saveBtn = page.locator('button.save-btn');
    await expect(saveBtn).toContainText('Save to Notion');
    await saveBtn.click();

    // 8. Verify it transitions to success status
    await expect(saveBtn).toHaveClass(/ok/);
    await expect(saveBtn).toContainText('Saved — Attempt 1');
  });

  test('queues attempt locally when Notion API returns an error', async ({ page, context }) => {
    // 2. Force Notion API to return 500 error
    await context.route('https://api.notion.com/v1/search', async (route) => {
      await route.fulfill({ status: 500, body: 'Internal Server Error' });
    });
    await context.route('https://api.notion.com/v1/pages', async (route) => {
      await route.fulfill({ status: 500, body: 'Internal Server Error' });
    });
    await context.route(/https:\/\/api\.notion\.com\/v1\/databases\/.*/, async (route) => {
      await route.fulfill({ status: 500, body: 'Internal Server Error' });
    });

    // 3. Mock LeetCode problem page DOM
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
            <textarea class="inputarea">print("Hello World")</textarea>
          </body>
          </html>
        `
      });
    });

    await page.goto('https://leetcode.com/problems/two-sum/');

    // 4. Toggle sidebar
    await page.keyboard.press('Control+Shift+N');

    // 5. Fill notes & capture code
    await page.locator('textarea.nb-area').fill('Offline note sync test.');
    await page.locator('button.cap-btn').click();

    // 6. Click save
    const saveBtn = page.locator('button.save-btn');
    await saveBtn.click();

    // 7. Verify it transitions to queued state in UI
    await expect(saveBtn).toHaveClass(/queued/);
    await expect(saveBtn).toContainText('Queued — will sync soon');

    // 8. Verify that the entry actually exists in local queue
    const [worker] = context.serviceWorkers();
    const queueCount = await worker.evaluate(async () => {
      const q = await chrome.storage.local.get('sync_queue');
      const list = q['sync_queue'] ? JSON.parse(q['sync_queue']) : [];
      return list.length;
    });
    expect(queueCount).toBe(1);
  });
});
