import i18n, { type InitOptions } from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import enCommon from './locales/en/common.json';
import deCommon from './locales/de/common.json';

export const SUPPORTED_LANGUAGES = ['en', 'de'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_STORAGE_KEY = '2anki-language';

export const i18nInitOptions: InitOptions = {
  resources: {
    en: { common: enCommon },
    de: { common: deCommon },
  },
  defaultNS: 'common',
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
