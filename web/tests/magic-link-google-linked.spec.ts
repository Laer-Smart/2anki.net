import { test, expect, type Page } from '@playwright/test';

const GOOGLE_LINKED_EMAIL = 'google-user@example.com';
const MAGIC_TOKEN = 'deterministic-magic-token';
const MOCK_SESSION_TOKEN = 'magic-link-session-token';

async function mockLoggedInLocals(page: Page) {
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
            email: GOOGLE_LINKED_EMAIL,
            linked_email: GOOGLE_LINKED_EMAIL,
          },
        },
        linked_email: GOOGLE_LINKED_EMAIL,
        user: { id: 7, name: 'Google User', email: GOOGLE_LINKED_EMAIL },
        features: { kiUI: true },
      }),
    });
  });
}

async function mockNotionConnection(page: Page) {
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

test.describe('Magic link for a Google-linked account', () => {
  test('requests a sign-in link and the issued link lands an authenticated session', async ({
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

    let magicLinkPurpose: string | null = null;
    await page.route('**/api/users/magic-link', async (route) => {
      const body = JSON.parse(route.request().postData() ?? '{}');
      magicLinkPurpose = body.purpose;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.goto('/login');

    const emailInput = page.getByRole('textbox', { name: 'Email' });
    await expect(emailInput).toBeVisible({ timeout: 10_000 });
    await emailInput.fill(GOOGLE_LINKED_EMAIL);

    await page.getByRole('button', { name: 'Email me a sign-in link' }).click();

    await expect(page.getByText('Check your email')).toBeVisible({
      timeout: 10_000,
    });
    expect(magicLinkPurpose).toBe('login');

    await page.route(`**/api/users/magic/${MAGIC_TOKEN}`, async (route) => {
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
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: MOCK_SESSION_TOKEN,
          purpose: 'login',
          redirect: '/notion',
        }),
      });
    });

    await mockLoggedInLocals(page);
    await mockNotionConnection(page);

    await page.goto(`/auth/magic?token=${MAGIC_TOKEN}`);

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
