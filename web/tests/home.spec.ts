import { test, expect } from '@playwright/test';

test('homepage has correct title and hero text', async ({ page }) => {
  await page.route('**/api/users/debug/locals**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        locals: { owner: null, patreon: false, subscriber: false },
        features: {},
      }),
    })
  );

  await page.goto('/');

  // Check title
  await expect(page).toHaveTitle(/2anki/);

  // Check that the hero heading is present
  const heroHeading = page.locator('h1');
  await expect(heroHeading).toBeVisible();
  await expect(heroHeading).toContainText('Your notes');
  await expect(heroHeading).toContainText('study in Anki');
});
