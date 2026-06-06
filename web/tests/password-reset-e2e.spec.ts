import { test, expect } from '@playwright/test';

const RESET_EMAIL = 'reset-user@example.com';
const MAGIC_TOKEN = 'deterministic-reset-magic-token';
const RESET_TOKEN = 'deterministic-reset-token';

test.describe('Password reset', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/users/debug/locals**', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Not authenticated' }),
      });
    });
  });

  test('requesting a reset sends a password_reset link and confirms it on screen', async ({
    page,
  }) => {
    let requestedPurpose: string | null = null;
    let requestedEmail: string | null = null;
    await page.route('**/api/users/magic-link', async (route) => {
      const body = JSON.parse(route.request().postData() ?? '{}');
      requestedPurpose = body.purpose;
      requestedEmail = body.email;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.goto('/forgot');

    const emailInput = page.getByLabel('Email');
    await expect(emailInput).toBeVisible({ timeout: 10_000 });
    await emailInput.fill(RESET_EMAIL);

    await page.getByRole('button', { name: 'Send reset link' }).click();

    await expect(page.getByText('Check your email')).toBeVisible({
      timeout: 10_000,
    });
    expect(requestedPurpose).toBe('password_reset');
    expect(requestedEmail).toBe(RESET_EMAIL);
  });

  test('a password_reset link hands off to the set-a-new-password page with its reset token', async ({
    page,
  }) => {
    await page.route(`**/api/users/magic/${MAGIC_TOKEN}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          purpose: 'password_reset',
          reset_token: RESET_TOKEN,
        }),
      });
    });

    await page.goto(`/auth/magic?token=${MAGIC_TOKEN}`);

    await expect(page).toHaveURL(new RegExp(`/users/r/${RESET_TOKEN}$`), {
      timeout: 15_000,
    });
  });
});
