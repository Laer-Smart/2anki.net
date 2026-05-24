import { useState } from 'react';
import { type Theme, applyTheme, getStoredTheme } from '../../lib/theme';
import styles from './ThemeSwitcher.module.css';

const THEMES: readonly { value: Theme; label: string; icon: string }[] = [
  { value: 'light', label: 'Light theme', icon: '☀' },
  { value: 'dark', label: 'Dark theme', icon: '☾' },
  { value: 'gold', label: 'Gold theme', icon: '✦' },
  { value: 'purple', label: 'Purple theme', icon: '◆' },
  { value: 'hotpink', label: 'Hot pink theme', icon: '✿' },
];

export function ThemeSwitcher() {
  const [current, setCurrent] = useState<Theme>(getStoredTheme);

  function handleSelect(theme: Theme) {
    setCurrent(theme);
    applyTheme(theme);
  }

  return (
    <div className={styles.container}>
      <span className={styles.label}>Appearance</span>
      <div className={styles.switcher} role="radiogroup" aria-label="Theme">
        {THEMES.map(({ value, label, icon }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={current === value}
            aria-label={label}
            title={label}
            className={`${styles.option} ${current === value ? styles.optionActive : ''}`}
            onClick={() => handleSelect(value)}
          >
            {icon}
          </button>
        ))}
      </div>
    </div>
  );
}
