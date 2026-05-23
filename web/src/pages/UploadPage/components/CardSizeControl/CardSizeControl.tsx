import { useState } from 'react';
import { track } from '../../../../lib/analytics/track';
import styles from './CardSizeControl.module.css';

type CardSize = 'short' | 'medium' | 'detailed';

const CARD_SIZE_KEY = 'card-size';
const DEFAULT_SIZE: CardSize = 'medium';

const SEGMENTS: Array<{ label: string; value: CardSize }> = [
  { label: 'Short', value: 'short' },
  { label: 'Medium', value: 'medium' },
  { label: 'Detailed', value: 'detailed' },
];

function readSavedSize(): CardSize {
  const saved = globalThis.localStorage?.getItem(CARD_SIZE_KEY);
  if (saved === 'short' || saved === 'medium' || saved === 'detailed') {
    return saved;
  }
  return DEFAULT_SIZE;
}

export function CardSizeControl() {
  const [size, setSize] = useState<CardSize>(() => {
    const initial = readSavedSize();
    globalThis.localStorage?.setItem(CARD_SIZE_KEY, initial);
    return initial;
  });

  const handleSelect = (value: CardSize) => {
    setSize(value);
    globalThis.localStorage?.setItem(CARD_SIZE_KEY, value);
    track('card_size_selected', { size: value });
  };

  return (
    <section className={styles.container} aria-label="Card size">
      <div className={styles.row}>
        <span className={styles.label}>Card size</span>
        <div
          className={styles.segmented}
          role="group"
          aria-label="Card size"
        >
          {SEGMENTS.map(({ label, value }) => (
            <button
              key={value}
              type="button"
              className={`${styles.segment} ${size === value ? styles.segmentActive : ''}`}
              aria-pressed={size === value}
              onClick={() => handleSelect(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <p className={styles.hint}>Short keeps cards to one fact. Detailed packs 3–4.</p>
    </section>
  );
}
