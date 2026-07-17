import i18next, { type i18n as I18nInstance } from 'i18next';
import { beforeAll, describe, expect, it } from 'vitest';

import { i18nInitOptions } from '../../index';

async function createGermanInstance(): Promise<I18nInstance> {
  const instance = i18next.createInstance();
  await instance.init({ ...i18nInitOptions, lng: 'de' });
  return instance;
}

describe('German monthly card-limit copy', () => {
  let de: I18nInstance;

  beforeAll(async () => {
    de = await createGermanInstance();
  });

  it('renders the pricing context banner in German while keeping the digit 100', () => {
    const banner = de.t('pricing.contextBanner');
    expect(banner).toContain('100 Karten pro Monat');
    expect(banner).not.toContain('100 cards per month');
  });

  it('renders the intro default with the German card-limit phrasing', () => {
    const intro = de.t('pricing.introDefault');
    expect(intro).toContain('100 Karten pro Monat');
    expect(intro).not.toContain('100 cards per month');
  });

  it('renders the free-plan account meta in German', () => {
    expect(de.t('planDetails.freeMeta', { ns: 'account' })).toBe(
      '100 Karten pro Monat.'
    );
  });
});
