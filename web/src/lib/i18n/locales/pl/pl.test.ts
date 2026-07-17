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
import plAccount from './account.json';
import plAnkify from './ankify.json';
import plChat from './chat.json';
import plCommon from './common.json';
import plErrors from './errors.json';
import plLanding from './landing.json';
import plMarketing from './marketing.json';
import plSearch from './search.json';
import plTools from './tools.json';

type Json = Record<string, unknown>;

const namespaces: Record<string, { en: Json; pl: Json }> = {
  account: { en: enAccount, pl: plAccount },
  ankify: { en: enAnkify, pl: plAnkify },
  chat: { en: enChat, pl: plChat },
  common: { en: enCommon, pl: plCommon },
  errors: { en: enErrors, pl: plErrors },
  landing: { en: enLanding, pl: plLanding },
  marketing: { en: enMarketing, pl: plMarketing },
  search: { en: enSearch, pl: plSearch },
  tools: { en: enTools, pl: plTools },
};

const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;

function collectLeafPaths(value: unknown, prefix: string, out: Set<string>) {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value as Json)) {
      collectLeafPaths(child, prefix ? `${prefix}.${key}` : key, out);
    }
    return;
  }
  out.add(prefix);
}

function baseKeys(value: Json): Set<string> {
  const leaves = new Set<string>();
  collectLeafPaths(value, '', leaves);
  const bases = new Set<string>();
  Array.from(leaves).forEach((leaf) => {
    bases.add(leaf.replace(PLURAL_SUFFIX, ''));
  });
  return bases;
}

function collectLeafEntries(
  value: unknown,
  prefix: string,
  out: Map<string, string>
) {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value as Json)) {
      collectLeafEntries(child, prefix ? `${prefix}.${key}` : key, out);
    }
    return;
  }
  if (typeof value === 'string') {
    out.set(prefix, value);
  }
}

describe('Polish locale', () => {
  it.each(Object.keys(namespaces))(
    '%s has every English key (accounting for plural expansion)',
    (name) => {
      const { en, pl } = namespaces[name];
      const plBases = baseKeys(pl);
      const missing = Array.from(baseKeys(en)).filter(
        (key) => !plBases.has(key)
      );
      expect(missing).toEqual([]);
    }
  );

  it.each(Object.keys(namespaces))(
    '%s introduces no keys absent from English (plurals aside)',
    (name) => {
      const { en, pl } = namespaces[name];
      const enBases = baseKeys(en);
      const extra = Array.from(baseKeys(pl)).filter((key) => !enBases.has(key));
      expect(extra).toEqual([]);
    }
  );

  it('translates values rather than copying the English text', () => {
    const enEntries = new Map<string, string>();
    const plEntries = new Map<string, string>();
    collectLeafEntries(enCommon, '', enEntries);
    collectLeafEntries(plCommon, '', plEntries);

    let differing = 0;
    Array.from(plEntries.entries()).forEach(([path, plValue]) => {
      const enValue = enEntries.get(path);
      if (enValue != null && enValue !== plValue) {
        differing += 1;
      }
    });
    expect(differing).toBeGreaterThan(50);
  });

  it('renders full Polish plural forms with _few and _many', () => {
    expect(plAccount.accessBanner).toHaveProperty('aboutHours_few');
    expect(plAccount.accessBanner).toHaveProperty('aboutHours_many');
    expect(plMarketing.status).toHaveProperty('daysAgo_few');
    expect(plMarketing.status).toHaveProperty('daysAgo_many');
    expect(plTools.mindmaps).toHaveProperty('nodeCount_few');
    expect(plTools.mindmaps).toHaveProperty('nodeCount_many');
  });

  it('keeps interpolation placeholders identical to English', () => {
    const enEntries = new Map<string, string>();
    const plEntries = new Map<string, string>();
    collectLeafEntries(enCommon, '', enEntries);
    collectLeafEntries(plCommon, '', plEntries);

    const placeholderPattern = /\{\{(\w+)\}\}/g;
    const placeholders = (value: string): string[] =>
      Array.from(value.matchAll(placeholderPattern))
        .map((match) => match[1])
        .sort();

    Array.from(enEntries.entries()).forEach(([path, enValue]) => {
      const plValue = plEntries.get(path);
      if (plValue == null) {
        return;
      }
      expect(placeholders(plValue)).toEqual(placeholders(enValue));
    });
  });
});
