import { afterEach, describe, expect, it } from 'vitest';

import i18n from './i18n';
import { getDistance } from './getDistance';

const TWO_MINUTES_AGO = new Date(Date.now() - 2 * 60 * 1000);

describe('getDistance', () => {
  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders an English relative phrase with a suffix', async () => {
    await i18n.changeLanguage('en');
    expect(getDistance(TWO_MINUTES_AGO)).toBe('2 minutes ago');
  });

  it('renders a German relative phrase when the language is German', async () => {
    await i18n.changeLanguage('de');
    expect(getDistance(TWO_MINUTES_AGO)).toBe('vor 2 Minuten');
  });
});
