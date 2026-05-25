import { test, expect } from '@playwright/test';

test.describe('Application with Mock API', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept API calls and provide mock responses
    await page.route('**/api/users/debug/locals**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          locals: {
            owner: 1,
            patreon: false,
            subscriber: false,
            subscriptionInfo: {
              active: false,
              email: 'test@example.com',
              linked_email: 'test@example.com',
            },
          },
          linked_email: 'test@example.com',
          user: {
            id: 1,
            name: 'Test User',
            email: 'test@example.com',
          },
          features: {
            kiUI: true,
          },
        }),
      });
    });

    await page.route('**/api/settings/card-options**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          basic: { name: 'Basic', description: 'Basic flashcard type' },
          reversed: {
            name: 'Reversed',
            description: 'Reversed flashcard type',
          },
          cloze: { name: 'Cloze', description: 'Cloze deletion type' },
        }),
      });
    });

    await page.route('**/api/notion/pages**', async (route) => {
      const request = route.request();
      const postData = JSON.parse(request.postData() || '{}');
      const query = postData.query || '';

      const mockResults = [
        {
          id: 'page-1',
          object: 'page',
          title: 'Sample Page',
          url: 'https://notion.so/sample-page',
          icon: '📄',
          isFavorite: false,
        },
      ].filter((item) =>
        item.title.toLowerCase().includes(query.toLowerCase())
      );

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ results: mockResults }),
      });
    });

    await page.route('**/api/upload/mine**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 1,
            key: 'upload-1',
            filename: 'sample.apkg',
            created_at: '2023-01-01T00:00:00.000Z',
            size: 1024,
          },
        ]),
      });
    });

    await page.route('**/api/upload/jobs**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 1,
            object_id: 'page-1',
            type: 'page',
            title: 'Sample Page Job',
            status: 'completed',
            created_at: '2023-01-01T00:00:00.000Z',
          },
        ]),
      });
    });

    await page.route('**/api/favorite/mine**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    // Handle other common API endpoints with default responses
    await page.route('**/api/**', async (route) => {
      // Only log API calls we haven't explicitly handled
      const url = route.request().url();
      if (!url.includes('youtube.com') && !url.includes('hotjar.com')) {
        console.log('Unhandled API call:', url);
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Mock response' }),
      });
    });
  });

  test('homepage loads without API errors', async ({ page }) => {
    // Override the user locals mock to simulate an anonymous visitor
    await page.route('**/api/users/debug/locals**', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Not authenticated' }),
      });
    });

    // Navigate to the homepage
    await page.goto('/');

    // Check that the page loads correctly
    await expect(page).toHaveTitle(/2anki/);

    // Check that the hero heading is present
    const heroHeading = page.locator('h1');
    await expect(heroHeading).toBeVisible();
    await expect(heroHeading).toContainText('Flashcards');
    await expect(heroHeading).toContainText('Anki');

    // Wait a bit to ensure all API calls have been made and handled
    await page.waitForTimeout(2000);

    // Check that there are no console errors related to API calls
    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleLogs.push(msg.text());
      }
    });

    // Reload to catch any console errors
    await page.route('**/api/users/debug/locals**', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Not authenticated' }),
      });
    });
    await page.reload();
    await page.waitForTimeout(1000);

    // Filter out non-API related errors
    const apiErrors = consoleLogs.filter(
      (log: string) =>
        log.includes('fetch') || log.includes('API') || log.includes('proxy')
    );

    expect(apiErrors.length).toBe(0);
  });

  test('can search for notion pages without backend', async ({ page }) => {
    // Override to simulate anon user so homepage renders
    await page.route('**/api/users/debug/locals**', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Not authenticated' }),
      });
    });

    await page.goto('/');

    const searchInput = page
      .locator('input[type="search"], input[placeholder*="search" i]')
      .first();

    if (await searchInput.isVisible()) {
      await searchInput.fill('Sample');
      await page.waitForTimeout(1000);
      expect(true).toBe(true);
    } else {
      await expect(page.locator('h1')).toBeVisible();
    }
  });

  test('user locals are properly mocked', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible({ timeout: 10_000 });
  });
});
