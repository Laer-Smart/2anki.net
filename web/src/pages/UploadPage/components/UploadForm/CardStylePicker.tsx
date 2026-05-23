import styles from './CardStylePicker.module.css';

export const CARD_STYLE_KEY = 'card-style';
export const DEFAULT_CARD_STYLE = 'cloze';

type CardStyleValue = 'cloze' | 'qa';

interface CardStylePickerProps {
  value: string;
  onChange: (value: CardStyleValue) => void;
}

const SEGMENTS: { value: CardStyleValue; label: string }[] = [
  { value: 'cloze', label: 'Cloze' },
  { value: 'qa', label: 'Q&A' },
];

const HELPER_TEXT: Record<CardStyleValue, string> = {
  cloze: 'Fill-in-the-blank cards with {{c1::...}} deletions.',
  qa: 'Question-and-answer cards, one fact per card.',
};

function CardStylePicker({ value, onChange }: Readonly<CardStylePickerProps>) {
  const activeStyle = (value === 'qa' ? 'qa' : 'cloze') as CardStyleValue;

  return (
    <div className={styles.wrapper}>
      <span className={styles.label}>Card style</span>
      <div role="radiogroup" aria-label="Card style" className={styles.segmentGroup}>
        {SEGMENTS.map((seg) => (
          <button
            key={seg.value}
            type="button"
            role="radio"
            aria-checked={activeStyle === seg.value}
            className={`${styles.segment} ${activeStyle === seg.value ? styles.segmentActive : ''}`}
            onClick={() => onChange(seg.value)}
          >
            {seg.label}
          </button>
        ))}
      </div>
      <p className={styles.helperText}>{HELPER_TEXT[activeStyle]}</p>
    </div>
  );
}

export default CardStylePicker;
