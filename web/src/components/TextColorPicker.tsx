import { useTranslation } from 'react-i18next';
import { FieldHint } from './FieldHint';
import sharedStyles from '../styles/shared.module.css';
import fontStyles from './FontSizePicker.module.css';
import fieldStyles from './CardOptionsForm/CardOptionsForm.module.css';
import localStyles from './TextColorPicker.module.css';
import { TEXT_COLOR_SWATCHES } from '../lib/textColorSwatches';

interface TextColorPickerDelegate {
  textColor: string;
  pickedTextColor: (color: string) => void;
}

function TextColorPicker(delegate: Readonly<TextColorPickerDelegate>) {
  const { textColor, pickedTextColor } = delegate;
  const { t } = useTranslation('chrome');
  const label = t('textColor.label');

  return (
    <div className={sharedStyles.flexColumn}>
      <div className={fontStyles.labelRow}>
        <label htmlFor="text-color">
          <strong>{label}</strong>
        </label>
        <FieldHint text={t('textColor.description')} />
      </div>
      <div
        id="text-color"
        className={fieldStyles.segmented}
        role="group"
        aria-label={label}
      >
        {TEXT_COLOR_SWATCHES.map(({ key, label, hex }) => {
          const isSelected = textColor === hex;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={isSelected}
              className={`${fieldStyles.segment} ${isSelected ? fieldStyles.segmentActive : ''}`}
              onClick={() => pickedTextColor(hex)}
            >
              {hex && (
                <span
                  className={localStyles.swatchDot}
                  style={{ backgroundColor: hex, marginRight: '0.35rem' }}
                />
              )}
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default TextColorPicker;
