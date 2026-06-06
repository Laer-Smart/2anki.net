import { test, expect } from '@playwright/test';

const MOCK_SESSION_TOKEN = 'notion-signin-session-token';

async function mockLoggedInLocals(page: import('@playwright/test').Page) {
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
            email: 'notion-user@example.com',
            linked_email: 'notion-user@example.com',
          },
        },
        linked_email: 'notion-user@example.com',
        user: { id: 1, name: 'Notion User', email: 'notion-user@example.com' },
        features: { kiUI: true },
      }),
    });
  });
}

async function mockNotionConnection(page: import('@playwright/test').Page) {
  await page.route('**/api/notion/get-notion-link**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        connected: false,
        connectionLink: 'https://example.test/notion/connect',
      }),
    });
  });
}

test.describe('Notion sign-in', () => {
  test('Continue with Notion completes the OAuth round-trip and lands an authenticated session', async ({
    page,
    context,
  }) => {
    await page.route('**/api/users/debug/locals**', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Not authenticated' }),
      });
    });

    await page.route('**/api/users/auth/notion/init**', async (route) => {
      await context.addCookies([
        {
          name: 'token',
          value: MOCK_SESSION_TOKEN,
          domain: 'localhost',
          path: '/',
          httpOnly: false,
          secure: false,
          sameSite: 'Lax',
        },
      ]);
      await route.fulfill({
        status: 302,
        headers: { location: '/notion' },
        body: '',
      });
    });

    await mockLoggedInLocals(page);
    await mockNotionConnection(page);

    await page.goto('/login');

    const notionButton = page.getByRole('link', {
      name: 'Continue with Notion',
    });
    await expect(notionButton).toBeVisible({ timeout: 10_000 });
    await expect(notionButton).toHaveAttribute(
      'href',
      '/api/users/auth/notion/init'
    );

    await notionButton.click();

    await expect(page).toHaveURL(/\/notion$/, { timeout: 15_000 });

    await expect(page.locator('h1')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('h1')).not.toContainText('Log in to 2anki');

    await expect
      .poll(
        async () => {
          const cookies = await context.cookies();
          return cookies.find((c) => c.name === 'token')?.value;
        },
        { timeout: 15_000, intervals: [500] }
      )
      .toBe(MOCK_SESSION_TOKEN);
  });
});
