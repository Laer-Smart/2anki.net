import { de } from './de';
import { en } from './en';
import { DeepPartial, EmailStrings } from './types';

export * from './types';

export function mergeStrings<T>(
  base: T,
  override: DeepPartial<T> | undefined
): T {
  if (override === undefined) {
    return base;
  }
  const overrideValue: unknown = override;
  if (typeof base === 'string') {
    return typeof overrideValue === 'string' && overrideValue.length > 0
      ? (overrideValue as T)
      : base;
  }
  const merged = {} as { [K in keyof T]: T[K] };
  for (const key of Object.keys(base as Record<string, unknown>) as Array<
    keyof T
  >) {
    const overrideChild = (override as { [K in keyof T]?: DeepPartial<T[K]> })[
      key
    ];
    merged[key] = mergeStrings(base[key], overrideChild);
  }
  return merged;
}

const catalogs: Record<'en' | 'de', EmailStrings> = {
  en,
  de: mergeStrings(en, de),
};

export function getEmailStrings(lang: string | null | undefined): EmailStrings {
  if (lang === 'de') {
    return catalogs.de;
  }
  return catalogs.en;
}
