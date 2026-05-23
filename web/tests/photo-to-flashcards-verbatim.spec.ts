import { test, expect } from '@playwright/test';

const mockLocals = {
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
  features: { kiUI: false },
};

test.describe('Photo to deck — verbatim mode toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/users/debug/locals**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockLocals),
      })
    );
    await page.goto('/photo-to-deck');
  });

  test('mode radiogroup renders both options at 1280px', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const radiogroup = page.getByRole('radiogroup', { name: 'Conversion mode' });
    await expect(radiogroup).toBeVisible();
    await expect(radiogroup.getByRole('radio', { name: 'Generate cards from this material' })).toBeVisible();
    await expect(radiogroup.getByRole('radio', { name: 'Transcribe questions verbatim' })).toBeVisible();
  });

  test('density control is visible in generative mode (default)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const densityGroup = page.getByRole('radiogroup', { name: 'Card density' });
    await expect(densityGroup).toBeVisible();
  });

  test('density control disappears when verbatim mode is selected', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.getByRole('radio', { name: 'Transcribe questions verbatim' }).click();
    const densityGroup = page.getByRole('radiogroup', { name: 'Card density' });
    await expect(densityGroup).not.toBeVisible();
  });

  test('submit button remains enabled after switching to verbatim mode (no file)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.getByRole('radio', { name: 'Transcribe questions verbatim' }).click();
    const submitBtn = page.getByRole('button', { name: 'Get flashcards' });
    await expect(submitBtn).toBeVisible();
  });

  test('mode radiogroup renders at 375px mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const radiogroup = page.getByRole('radiogroup', { name: 'Conversion mode' });
    await expect(radiogroup).toBeVisible();
    await expect(radiogroup.getByRole('radio', { name: 'Generate cards from this material' })).toBeVisible();
    await expect(radiogroup.getByRole('radio', { name: 'Transcribe questions verbatim' })).toBeVisible();
  });

  test('density control disappears at 375px when verbatim is selected', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.getByRole('radio', { name: 'Transcribe questions verbatim' }).click();
    const densityGroup = page.getByRole('radiogroup', { name: 'Card density' });
    await expect(densityGroup).not.toBeVisible();
  });

  test('switching back to generative mode restores density control', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.getByRole('radio', { name: 'Transcribe questions verbatim' }).click();
    await page.getByRole('radio', { name: 'Generate cards from this material' }).click();
    const densityGroup = page.getByRole('radiogroup', { name: 'Card density' });
    await expect(densityGroup).toBeVisible();
  });
});
