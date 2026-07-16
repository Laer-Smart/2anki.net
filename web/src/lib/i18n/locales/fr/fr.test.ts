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
import frAccount from './account.json';
import frAnkify from './ankify.json';
import frChat from './chat.json';
import frCommon from './common.json';
import frErrors from './errors.json';
import frLanding from './landing.json';
import frMarketing from './marketing.json';
import frSearch from './search.json';
import frTools from './tools.json';

type Json = Record<string, unknown>;

function flatten(value: Json, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (entry !== null && typeof entry === 'object') {
      Object.assign(out, flatten(entry as Json, path));
    } else {
      out[path] = String(entry);
    }
  }
  return out;
}

function placeholders(text: string): string[] {
  return (text.match(/{{.*?}}/g) ?? []).sort();
}

const namespaces = [
  { name: 'account', en: enAccount, fr: frAccount },
  { name: 'ankify', en: enAnkify, fr: frAnkify },
  { name: 'chat', en: enChat, fr: frChat },
  { name: 'common', en: enCommon, fr: frCommon },
  { name: 'errors', en: enErrors, fr: frErrors },
  { name: 'landing', en: enLanding, fr: frLanding },
  { name: 'marketing', en: enMarketing, fr: frMarketing },
  { name: 'search', en: enSearch, fr: frSearch },
  { name: 'tools', en: enTools, fr: frTools },
] as const;

describe('French locale parity with English', () => {
  it.each(namespaces)('$name has the same key set as English', ({ en, fr }) => {
    const enKeys = Object.keys(flatten(en as Json)).sort();
    const frKeys = Object.keys(flatten(fr as Json)).sort();
    expect(frKeys).toEqual(enKeys);
  });

  it.each(namespaces)(
    '$name keeps every interpolation placeholder',
    ({ en, fr }) => {
      const enFlat = flatten(en as Json);
      const frFlat = flatten(fr as Json);
      for (const key of Object.keys(enFlat)) {
        expect(placeholders(frFlat[key])).toEqual(placeholders(enFlat[key]));
      }
    }
  );

  it.each(namespaces)('$name is actually translated', ({ en, fr }) => {
    const enFlat = flatten(en as Json);
    const frFlat = flatten(fr as Json);
    const keys = Object.keys(enFlat);
    const identical = keys.filter((key) => enFlat[key] === frFlat[key]).length;
    expect(identical / keys.length).toBeLessThan(0.3);
  });
});
