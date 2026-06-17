import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Configuration for LeetNote Extension
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Run sequentially to prevent extension storage state pollution
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: 'https://leetcode.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Extension testing requires headless: false mode in Playwright
    headless: false,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
});
