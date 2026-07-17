import { useTranslation } from 'react-i18next';
import styles from '../styles/shared.module.css';
import { FieldHint } from './FieldHint';
import localStyles from './FontSizePicker.module.css';

interface FontPickerDelegate {
  fontSize: string;
  pickedFontSize: (fs: string) => void;
}

function FontSizePicker(delegate: Readonly<FontPickerDelegate>) {
  const { fontSize, pickedFontSize } = delegate;
  const { t } = useTranslation('chrome');
  const displayValue = fontSize || '20';

  return (
    <div className={styles.flexColumn}>
      <div className={localStyles.labelRow}>
        <label htmlFor="font-size">
          <strong>{t('fontSize.label')}</strong>
        </label>
        <FieldHint text={t('fontSize.description')} />
      </div>
      <div
        className={styles.flexRow}
        style={{ width: '100%', gap: '0.75rem', alignItems: 'center' }}
      >
        <input
          id="font-size"
          name="font-size"
          type="range"
          min="10"
          max="100"
          value={displayValue}
          onChange={(event) => pickedFontSize(event.target.value)}
          style={{ flex: 1, accentColor: 'var(--color-primary)' }}
        />
        <span
          style={{
            minWidth: '3.5rem',
            textAlign: 'right',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-primary)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {displayValue} px
        </span>
      </div>
    </div>
  );
}

export default FontSizePicker;
