import { type KeyboardEvent, useRef, useState } from 'react';
import { type Theme, applyTheme, getStoredTheme } from '../../lib/theme';
import styles from './ThemeSwitcher.module.css';

const THEMES: readonly { value: Theme; label: string; icon: string }[] = [
  { value: 'light', label: 'Light theme', icon: '☀' },
  { value: 'dark', label: 'Dark theme', icon: '☾' },
  { value: 'gold', label: 'Gold theme', icon: '✦' },
  { value: 'purple', label: 'Purple theme', icon: '◆' },
  { value: 'hotpink', label: 'Hot pink theme', icon: '✿' },
];

const FORWARD_KEYS = new Set(['ArrowRight', 'ArrowDown']);
const BACKWARD_KEYS = new Set(['ArrowLeft', 'ArrowUp']);

export function ThemeSwitcher() {
  const [current, setCurrent] = useState<Theme>(getStoredTheme);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function handleSelect(theme: Theme) {
    setCurrent(theme);
    applyTheme(theme);
  }

  function moveSelection(currentIndex: number, delta: number) {
    const nextIndex = (currentIndex + delta + THEMES.length) % THEMES.length;
    handleSelect(THEMES[nextIndex].value);
    buttonRefs.current[nextIndex]?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (FORWARD_KEYS.has(event.key)) {
      event.preventDefault();
      moveSelection(index, 1);
    } else if (BACKWARD_KEYS.has(event.key)) {
      event.preventDefault();
      moveSelection(index, -1);
    }
  }

  return (
    <div className={styles.container}>
      <span className={styles.label}>Appearance</span>
      <div className={styles.switcher} role="radiogroup" aria-label="Theme">
        {THEMES.map(({ value, label, icon }, index) => {
          const isSelected = current === value;
          return (
            <button
              key={value}
              ref={(node) => {
                buttonRefs.current[index] = node;
              }}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={label}
              title={label}
              tabIndex={isSelected ? 0 : -1}
              className={`${styles.option} ${isSelected ? styles.optionActive : ''}`}
              onClick={() => handleSelect(value)}
              onKeyDown={(event) => handleKeyDown(event, index)}
            >
              {icon}
            </button>
          );
        })}
      </div>
    </div>
  );
}
