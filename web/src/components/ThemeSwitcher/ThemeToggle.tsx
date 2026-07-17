import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type Theme, applyTheme, getStoredTheme } from '../../lib/theme';
import styles from './ThemeSwitcher.module.css';

const THEMES: readonly { value: Theme; icon: string }[] = [
  { value: 'light', icon: '☀' },
  { value: 'dark', icon: '☾' },
  { value: 'gold', icon: '✦' },
  { value: 'purple', icon: '◆' },
  { value: 'hotpink', icon: '✿' },
];

export function ThemeToggle() {
  const { t } = useTranslation('chrome');
  const [current, setCurrent] = useState<Theme>(getStoredTheme);

  function cycle() {
    const idx = THEMES.findIndex((t) => t.value === current);
    const next = THEMES[(idx + 1) % THEMES.length];
    setCurrent(next.value);
    applyTheme(next.value);
  }

  const active = THEMES.find((t) => t.value === current) ?? THEMES[0];

  return (
    <button
      type="button"
      className={`${styles.option} ${styles.optionActive}`}
      onClick={cycle}
      aria-label={t('theme.cycle')}
      title={t('theme.cycle')}
    >
      {active.icon}
    </button>
  );
}
