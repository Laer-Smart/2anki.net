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

import esAccount from './account.json';
import esAnkify from './ankify.json';
import esChat from './chat.json';
import esCommon from './common.json';
import esErrors from './errors.json';
import esLanding from './landing.json';
import esMarketing from './marketing.json';
import esSearch from './search.json';
import esTools from './tools.json';

type Json = Record<string, unknown>;

function flatKeys(value: unknown, prefix = ''): string[] {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return [];
  }
  return Object.entries(value as Json).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    const childKeys = flatKeys(child, path);
    return childKeys.length > 0 ? childKeys : [path];
  });
}

function leafPairs(value: unknown, prefix = ''): Array<[string, string]> {
  if (typeof value === 'string') {
    return [[prefix, value]];
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return [];
  }
  return Object.entries(value as Json).flatMap(([key, child]) =>
    leafPairs(child, prefix ? `${prefix}.${key}` : key)
  );
}

const namespaces: Array<[string, Json, Json]> = [
  ['account', enAccount, esAccount],
  ['ankify', enAnkify, esAnkify],
  ['chat', enChat, esChat],
  ['common', enCommon, esCommon],
  ['errors', enErrors, esErrors],
  ['landing', enLanding, esLanding],
  ['marketing', enMarketing, esMarketing],
  ['search', enSearch, esSearch],
  ['tools', enTools, esTools],
];

describe('Spanish locale', () => {
  it.each(namespaces)('%s has the same key set as English', (_name, en, es) => {
    expect(flatKeys(es).sort()).toEqual(flatKeys(en).sort());
  });

  it.each(namespaces)(
    '%s preserves interpolation placeholders',
    (_name, en, es) => {
      const enLeaves = new Map(leafPairs(en));
      for (const [key, esValue] of leafPairs(es)) {
        const enValue = enLeaves.get(key);
        if (enValue == null) {
          continue;
        }
        const enTokens = (enValue.match(/{{\s*[\w]+\s*}}/g) ?? []).sort();
        const esTokens = (esValue.match(/{{\s*[\w]+\s*}}/g) ?? []).sort();
        expect(esTokens, `placeholders differ at ${key}`).toEqual(enTokens);
      }
    }
  );

  it.each(namespaces)('%s actually translates most values', (_name, en, es) => {
    const enLeaves = new Map(leafPairs(en));
    const esLeaves = leafPairs(es);
    let translatable = 0;
    let translated = 0;
    for (const [key, esValue] of esLeaves) {
      const enValue = enLeaves.get(key);
      if (enValue == null || enValue.trim().length < 4) {
        continue;
      }
      translatable += 1;
      if (esValue !== enValue) {
        translated += 1;
      }
    }
    expect(translatable).toBeGreaterThan(0);
    expect(translated / translatable).toBeGreaterThan(0.6);
  });
});
