import { describe, expect, it } from 'vitest';

import enAccount from '../en/account.json';
import enAnkify from '../en/ankify.json';
import enChat from '../en/chat.json';
import enCommon from '../en/common.json';
import enErrors from '../en/errors.json';
import enLanding from '../en/landing.json';
import enMarketing from '../en/marketing.json';
import enSearch from '../en/search.json';
import enTools from '../en/tools.json';

import ruAccount from './account.json';
import ruAnkify from './ankify.json';
import ruChat from './chat.json';
import ruCommon from './common.json';
import ruErrors from './errors.json';
import ruLanding from './landing.json';
import ruMarketing from './marketing.json';
import ruSearch from './search.json';
import ruTools from './tools.json';

type Json = Record<string, unknown>;

const namespaces: Record<string, { en: Json; ru: Json }> = {
  account: { en: enAccount, ru: ruAccount },
  ankify: { en: enAnkify, ru: ruAnkify },
  chat: { en: enChat, ru: ruChat },
  common: { en: enCommon, ru: ruCommon },
  errors: { en: enErrors, ru: ruErrors },
  landing: { en: enLanding, ru: ruLanding },
  marketing: { en: enMarketing, ru: ruMarketing },
  search: { en: enSearch, ru: ruSearch },
  tools: { en: enTools, ru: ruTools },
};

const RUSSIAN_PLURAL_FORMS = ['_one', '_few', '_many', '_other'];

function flatten(value: unknown, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  if (typeof value === 'string') {
    out[prefix] = value;
    return out;
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value as Json)) {
      const nextPrefix = prefix ? `${prefix}.${key}` : key;
      Object.assign(out, flatten(child, nextPrefix));
    }
  }
  return out;
}

function placeholderTokens(value: string): string[] {
  const matches = value.match(/\{\{\w+\}\}/g) ?? [];
  return matches
    .map((token) => token.slice(2, -2))
    .filter((token) => token !== 'count')
    .sort();
}

function expectedRuKeys(enKey: string): string[] {
  const pluralSuffix = ['_one', '_other'].find((suffix) =>
    enKey.endsWith(suffix)
  );
  if (pluralSuffix) {
    const base = enKey.slice(0, -pluralSuffix.length);
    return RUSSIAN_PLURAL_FORMS.map((form) => `${base}${form}`);
  }
  return [enKey];
}

describe('ru locale parity', () => {
  for (const [name, { en, ru }] of Object.entries(namespaces)) {
    const enFlat = flatten(en);
    const ruFlat = flatten(ru);

    it(`${name}: every English key has a Russian value`, () => {
      const missing: string[] = [];
      for (const enKey of Object.keys(enFlat)) {
        for (const ruKey of expectedRuKeys(enKey)) {
          const value = ruFlat[ruKey];
          if (typeof value !== 'string' || value.length === 0) {
            missing.push(ruKey);
          }
        }
      }
      expect(missing).toEqual([]);
    });

    it(`${name}: preserves interpolation placeholders`, () => {
      const mismatched: string[] = [];
      for (const [enKey, enValue] of Object.entries(enFlat)) {
        const placeholders = placeholderTokens(enValue);
        if (placeholders.length === 0) {
          continue;
        }
        for (const ruKey of expectedRuKeys(enKey)) {
          const ruValue = ruFlat[ruKey];
          if (typeof ruValue !== 'string') {
            continue;
          }
          if (placeholderTokens(ruValue).join(',') !== placeholders.join(',')) {
            mismatched.push(ruKey);
          }
        }
      }
      expect(mismatched).toEqual([]);
    });
  }

  it('translates most values away from English', () => {
    let comparable = 0;
    let identical = 0;
    for (const { en, ru } of Object.values(namespaces)) {
      const enFlat = flatten(en);
      const ruFlat = flatten(ru);
      for (const [enKey, enValue] of Object.entries(enFlat)) {
        if (enKey.endsWith('_one') || enKey.endsWith('_other')) {
          continue;
        }
        const ruValue = ruFlat[enKey];
        if (typeof ruValue !== 'string') {
          continue;
        }
        comparable += 1;
        if (ruValue === enValue) {
          identical += 1;
        }
      }
    }
    expect(comparable).toBeGreaterThan(500);
    expect(identical / comparable).toBeLessThan(0.15);
  });

  it('expands English one/other plurals into Russian one/few/many/other', () => {
    const decks = ruCommon.upload.form as Record<string, string>;
    expect(decks.decksReady_one).toContain('колода');
    expect(decks.decksReady_few).toContain('колоды');
    expect(decks.decksReady_many).toContain('колод');
    expect(decks.decksReady_few).not.toBe(decks.decksReady_one);
    expect(decks.decksReady_many).not.toBe(decks.decksReady_few);

    const minutes = ruMarketing.status as Record<string, string>;
    expect(minutes.minutesAgo_few).toBeDefined();
    expect(minutes.minutesAgo_many).toBeDefined();
    expect(minutes.minutesAgo_many).not.toBe(minutes.minutesAgo_few);
  });
});
