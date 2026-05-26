import styles from '../styles/shared.module.css';
import { FieldHint } from './FieldHint';
import localStyles from './FontSizePicker.module.css';

const DESCRIPTION = 'Controls the base font size in your generated cards. Range: 10–100 px.';

interface FontPickerDelegate {
  fontSize: string;
  pickedFontSize: (fs: string) => void;
}

function FontSizePicker(delegate: Readonly<FontPickerDelegate>) {
  const { fontSize, pickedFontSize } = delegate;
  const displayValue = fontSize || '20';

  return (
    <div className={styles.flexColumn}>
      <div className={localStyles.labelRow}>
        <label htmlFor="font-size">
          <strong>Font size</strong>
        </label>
        <FieldHint text={DESCRIPTION} />
      </div>
      <div className={styles.flexRow} style={{ width: '100%', gap: '0.75rem', alignItems: 'center' }}>
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
        <span style={{ minWidth: '3.5rem', textAlign: 'right', fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>
          {displayValue} px
        </span>
      </div>
      <div className={localStyles.preview}>
        <span className={localStyles.previewCaption}>Preview</span>
        <span
          aria-hidden
          className={localStyles.previewSample}
          style={{ fontSize: `${displayValue}px` }}
        >
          Sample card text
        </span>
      </div>
    </div>
  );
}

export default FontSizePicker;
