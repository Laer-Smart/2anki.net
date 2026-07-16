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

import ptAccount from './account.json';
import ptAnkify from './ankify.json';
import ptChat from './chat.json';
import ptCommon from './common.json';
import ptErrors from './errors.json';
import ptLanding from './landing.json';
import ptMarketing from './marketing.json';
import ptSearch from './search.json';
import ptTools from './tools.json';

type Json = Record<string, unknown>;

function flatten(obj: Json, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object') {
      Object.assign(out, flatten(value as Json, path));
    } else {
      out[path] = String(value);
    }
  }
  return out;
}

const namespaces: Array<[string, Json, Json]> = [
  ['account', enAccount, ptAccount],
  ['ankify', enAnkify, ptAnkify],
  ['chat', enChat, ptChat],
  ['common', enCommon, ptCommon],
  ['errors', enErrors, ptErrors],
  ['landing', enLanding, ptLanding],
  ['marketing', enMarketing, ptMarketing],
  ['search', enSearch, ptSearch],
  ['tools', enTools, ptTools],
];

const placeholderPattern = /{{\s*[^}]+?\s*}}/g;

function placeholders(value: string): string[] {
  return (value.match(placeholderPattern) ?? []).sort();
}

describe('Portuguese (pt) locale', () => {
  it.each(namespaces)('%s has the exact same keys as English', (_name, en, pt) => {
    const enKeys = Object.keys(flatten(en)).sort();
    const ptKeys = Object.keys(flatten(pt)).sort();
    expect(ptKeys).toEqual(enKeys);
  });

  it.each(namespaces)(
    '%s preserves every interpolation placeholder',
    (_name, en, pt) => {
      const enFlat = flatten(en);
      const ptFlat = flatten(pt);
      for (const [key, enValue] of Object.entries(enFlat)) {
        expect(placeholders(ptFlat[key])).toEqual(placeholders(enValue));
      }
    }
  );

  it.each(namespaces)(
    '%s is translated — most values differ from English',
    (_name, en, pt) => {
      const enFlat = flatten(en);
      const ptFlat = flatten(pt);
      const keys = Object.keys(enFlat);
      const differing = keys.filter((key) => ptFlat[key] !== enFlat[key]);
      expect(differing.length / keys.length).toBeGreaterThan(0.7);
    }
  );
});
