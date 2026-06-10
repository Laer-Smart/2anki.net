import { test, expect } from '@playwright/test';

const loggedInFreeLocals = {
  user: {
    id: 1,
    email: 'free@example.com',
    patreon: false,
    created_at: '2026-06-16T00:00:00Z',
  },
  locals: { owner: 1, patreon: false, subscriber: false },
  features: {},
  autoSyncCapReached: false,
  autoSyncActive: false,
};

const v2Prices = {
  cohort: 'v2',
  legacy: false,
  monthly: { cents: 799 },
  annual: { cents: 6400 },
  lockInDeadline: null,
};

test.describe('Unlimited checkout', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/users/debug/locals**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(loggedInFreeLocals),
      })
    );
    await page.route('**/api/checkout/prices', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(v2Prices),
      })
    );
  });

  test('annual is selected by default with the v2 per-month hero price', async ({
    page,
  }) => {
    await page.goto('/pricing');

    await expect(page.getByText('$5.33')).toBeVisible();
    await expect(
      page.getByText('$64/year billed yearly · save 33%')
    ).toBeVisible();
  });

  test('Get Unlimited starts an annual checkout and redirects to Stripe', async ({
    page,
  }) => {
    let checkoutBody: { interval?: string } = {};
    await page.route('**/api/checkout/unlimited', async (route) => {
      checkoutBody = JSON.parse(route.request().postData() ?? '{}');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ url: 'https://checkout.stripe.com/c/pay/test' }),
      });
    });

    await page.goto('/pricing');
    await page.getByRole('button', { name: 'Get Unlimited' }).click();

    await expect.poll(() => checkoutBody.interval).toBe('year');
  });
});
