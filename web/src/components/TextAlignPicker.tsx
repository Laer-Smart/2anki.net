import { useTranslation } from 'react-i18next';
import { FieldHint } from './FieldHint';
import sharedStyles from '../styles/shared.module.css';
import fontStyles from './FontSizePicker.module.css';
import fieldStyles from './CardOptionsForm/CardOptionsForm.module.css';
import { TEXT_ALIGN_OPTIONS } from '../lib/textAlignOptions';

interface TextAlignPickerDelegate {
  textAlign: string;
  pickedTextAlign: (align: string) => void;
}

function TextAlignPicker(delegate: Readonly<TextAlignPickerDelegate>) {
  const { textAlign, pickedTextAlign } = delegate;
  const { t } = useTranslation('chrome');
  const label = t('textAlign.label');

  return (
    <div className={sharedStyles.flexColumn}>
      <div className={fontStyles.labelRow}>
        <label htmlFor="text-align">
          <strong>{label}</strong>
        </label>
        <FieldHint text={t('textAlign.description')} />
      </div>
      <div
        id="text-align"
        className={fieldStyles.segmented}
        role="group"
        aria-label={label}
      >
        {TEXT_ALIGN_OPTIONS.map(({ key, label, value }) => {
          const isSelected = textAlign === value;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={isSelected}
              className={`${fieldStyles.segment} ${isSelected ? fieldStyles.segmentActive : ''}`}
              onClick={() => pickedTextAlign(value)}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default TextAlignPicker;
