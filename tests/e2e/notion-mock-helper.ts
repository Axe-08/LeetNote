import { type BrowserContext } from '@playwright/test';

/**
 * Sets up Playwright context-wide routing to mock all required Notion REST API responses.
 * This ensures E2E tests run offline and in sandboxed environments without requiring a live token.
 */
export async function setupNotionMocks(context: BrowserContext) {
  // Mock search endpoint for listing pages/databases
  await context.route('https://api.notion.com/v1/search', async (route) => {
    const request = route.request();
    if (request.method() !== 'POST') {
      return route.continue();
    }
    
    const postData = request.postDataJSON() || {};
    
    if (postData.filter?.value === 'page') {
      // Listing eligible parent pages for DB setup
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          object: 'list',
          results: [
            {
              object: 'page',
              id: 'mock-parent-page-id',
              properties: {
                title: {
                  type: 'title',
                  title: [{ plain_text: 'DSA Master Parent Page' }]
                }
              }
            }
          ]
        })
      });
    } else if (postData.filter?.value === 'database') {
      // Listing existing databases
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          object: 'list',
          results: [
            {
              object: 'database',
              id: 'mock-existing-db-id',
              title: [{ plain_text: 'Existing LeetCode Journal' }],
              properties: {
                'Name': { title: {} },
                'Problem Number': { number: {} },
                'Difficulty': { select: {} },
                'Tags': { multi_select: {} },
                'URL': { url: {} },
                'Date Saved': { date: {} },
                'Last Attempted': { date: {} },
                'Confidence': { select: {} },
                'Next Review': { date: {} },
                'Attempts': { number: {} },
                'Status': { select: {} }
              }
            }
          ]
        })
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ object: 'list', results: [] })
      });
    }
  });

  // Mock database creation
  await context.route('https://api.notion.com/v1/databases', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        object: 'database',
        id: 'mock-created-db-id',
        title: [{ plain_text: 'LeetNotion — DSA Journal' }]
      })
    });
  });

  // Mock database schema retrieval / patching
  await context.route(/https:\/\/api\.notion\.com\/v1\/databases\/([a-zA-Z0-9_-]+)$/, async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          object: 'database',
          id: 'mock-existing-db-id',
          properties: {
            'Name': { title: {} },
            'Problem Number': { number: {} },
            'Difficulty': { select: {} }
            // Simulates some properties present
          }
        })
      });
    } else if (method === 'PATCH') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          object: 'database',
          id: 'mock-existing-db-id',
          title: [{ plain_text: 'Fixed LeetCode Journal' }]
        })
      });
    } else {
      await route.continue();
    }
  });

  // Mock finding problem by number in the database query
  await context.route(/https:\/\/api\.notion\.com\/v1\/databases\/([a-zA-Z0-9_-]+)\/query$/, async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    
    // Default: Return empty results (means problem doesn't exist yet in Notion)
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        object: 'list',
        results: []
      })
    });
  });

  // Mock creating a new problem page
  await context.route('https://api.notion.com/v1/pages', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        object: 'page',
        id: 'mock-new-page-id',
        url: 'https://notion.so/mock-new-page-id'
      })
    });
  });

  // Mock appending attempts (creating block children)
  await context.route(/https:\/\/api\.notion\.com\/v1\/blocks\/([a-zA-Z0-9_-]+)\/children$/, async (route) => {
    if (route.request().method() !== 'PATCH') return route.continue();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        object: 'list',
        results: [{ object: 'block', id: 'mock-appended-block-id' }]
      })
    });
  });

  // Mock updating page properties (like status, attempts)
  await context.route(/https:\/\/api\.notion\.com\/v1\/pages\/([a-zA-Z0-9_-]+)$/, async (route) => {
    if (route.request().method() !== 'PATCH') return route.continue();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        object: 'page',
        id: 'mock-updated-page-id'
      })
    });
  });
}
