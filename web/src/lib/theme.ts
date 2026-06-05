import { scheduleSync } from './data_layer/userPreferencesSync';

export type Theme = 'light' | 'dark' | 'gold' | 'purple' | 'hotpink';

const STORAGE_KEY = '2anki-theme';
const VALID_THEMES: ReadonlySet<string> = new Set([
  'light',
  'dark',
  'gold',
  'purple',
  'hotpink',
]);

export const THEME_CHANGE_EVENT = '2anki-theme-change';

function getSystemTheme(): Theme {
  if (globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

export function getStoredTheme(): Theme {
  const stored = globalThis.localStorage?.getItem(STORAGE_KEY);
  if (stored && VALID_THEMES.has(stored)) {
    return stored as Theme;
  }
  return getSystemTheme();
}

export function applyTheme(theme: Theme): void {
  if (theme === 'light') {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = theme;
  }
  globalThis.localStorage?.setItem(STORAGE_KEY, theme);
  scheduleSync();
  globalThis.dispatchEvent?.(
    new CustomEvent(THEME_CHANGE_EVENT, { detail: theme })
  );
}

export function initTheme(): void {
  applyTheme(getStoredTheme());
}
