import i18n, { type InitOptions, type Resource } from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

export const SUPPORTED_LANGUAGES = ['en', 'de'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_STORAGE_KEY = '2anki-language';

// Every locale namespace file under ./locales/<lang>/<namespace>.json is loaded
// automatically. To add a surface's strings, drop a new <namespace>.json into
// each language folder and reference it with t('<namespace>:key') — no edit to
// this file is required, which lets parallel work add namespaces without
// colliding here.
const localeModules = import.meta.glob<{ default: Record<string, unknown> }>(
  './locales/*/*.json',
  { eager: true }
);

function buildResources(): Resource {
  const resources: Resource = {};
  for (const [path, mod] of Object.entries(localeModules)) {
    const match = /\.\/locales\/([^/]+)\/([^/]+)\.json$/.exec(path);
    if (!match) {
      continue;
    }
    const [, language, namespace] = match;
    resources[language] ??= {};
    (resources[language] as Record<string, unknown>)[namespace] =
      mod.default ?? mod;
  }
  return resources;
}

export const i18nInitOptions: InitOptions = {
  resources: buildResources(),
  defaultNS: 'common',
  fallbackNS: 'common',
  fallbackLng: 'en',
  supportedLngs: [...SUPPORTED_LANGUAGES],
  nonExplicitSupportedLngs: true,
  load: 'languageOnly',
  detection: {
    order: ['localStorage', 'navigator'],
    lookupLocalStorage: LANGUAGE_STORAGE_KEY,
    caches: ['localStorage'],
  },
  interpolation: {
    escapeValue: false,
  },
};

export function initI18n() {
  if (i18n.isInitialized) {
    return i18n;
  }

  i18n.use(LanguageDetector).use(initReactI18next).init(i18nInitOptions);

  return i18n;
}

export default i18n;
