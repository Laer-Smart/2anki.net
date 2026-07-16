import { describe, expect, it } from 'vitest';

type JsonObject = Record<string, unknown>;

const siblingModules = import.meta.glob<{ default: JsonObject }>(
  '../*/*.json',
  { eager: true }
);
const japaneseModules = import.meta.glob<{ default: JsonObject }>('./*.json', {
  eager: true,
});

const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;

function collectKeys(value: unknown, prefix: string, out: Set<string>): void {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    out.add(prefix.replace(PLURAL_SUFFIX, ''));
    return;
  }
  for (const [key, child] of Object.entries(value as JsonObject)) {
    const path = prefix ? `${prefix}.${key}` : key;
    collectKeys(child, path, out);
  }
}

function collectValues(
  value: unknown,
  prefix: string,
  out: Map<string, string>
): void {
  if (typeof value === 'string') {
    out.set(prefix, value);
    return;
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return;
  }
  for (const [key, child] of Object.entries(value as JsonObject)) {
    const path = prefix ? `${prefix}.${key}` : key;
    collectValues(child, path, out);
  }
}

function loadNamespace(language: string, namespace: string): JsonObject {
  if (language === 'ja') {
    const mod = japaneseModules[`./${namespace}.json`];
    if (!mod) {
      throw new Error(`Missing locale module ja/${namespace}.json`);
    }
    return mod.default;
  }
  const suffix = `/${language}/${namespace}.json`;
  const entry = Object.entries(siblingModules).find(([path]) =>
    path.endsWith(suffix)
  );
  if (!entry) {
    throw new Error(`Missing locale module ${suffix}`);
  }
  return entry[1].default;
}

const namespaces = [
  'account',
  'ankify',
  'chat',
  'common',
  'errors',
  'landing',
  'marketing',
  'search',
  'tools',
];

describe('Japanese locale parity', () => {
  it.each(namespaces)(
    'ja/%s.json has the same logical keys as en',
    (namespace) => {
      const enKeys = new Set<string>();
      const jaKeys = new Set<string>();
      collectKeys(loadNamespace('en', namespace), '', enKeys);
      collectKeys(loadNamespace('ja', namespace), '', jaKeys);

      const missingInJa = Array.from(enKeys).filter((key) => !jaKeys.has(key));
      const extraInJa = Array.from(jaKeys).filter((key) => !enKeys.has(key));

      expect(missingInJa).toEqual([]);
      expect(extraInJa).toEqual([]);
    }
  );

  it.each(namespaces)(
    'ja/%s.json translates its values away from English',
    (namespace) => {
      const enValues = new Map<string, string>();
      const jaValues = new Map<string, string>();
      collectValues(loadNamespace('en', namespace), '', enValues);
      collectValues(loadNamespace('ja', namespace), '', jaValues);

      const comparable = Array.from(jaValues.entries()).filter(([key]) => {
        const enValue = enValues.get(key);
        if (enValue == null) {
          return false;
        }
        return /[A-Za-z]{4,}/.test(enValue) && !enValue.includes('{{');
      });

      const translated = comparable.filter(
        ([key, jaValue]) => jaValue !== enValues.get(key)
      );

      expect(comparable.length).toBeGreaterThan(10);
      expect(translated.length).toBeGreaterThan(comparable.length * 0.8);
    }
  );
});
