import { FieldHint } from './FieldHint';
import sharedStyles from '../styles/shared.module.css';
import fontStyles from './FontSizePicker.module.css';
import fieldStyles from './CardOptionsForm/CardOptionsForm.module.css';
import { TEXT_ALIGN_OPTIONS } from '../lib/textAlignOptions';

const DESCRIPTION =
  'Sets the text alignment on your generated cards. Default keeps the template alignment — pick Left to match your Notion prose.';

interface TextAlignPickerDelegate {
  textAlign: string;
  pickedTextAlign: (align: string) => void;
}

function TextAlignPicker(delegate: Readonly<TextAlignPickerDelegate>) {
  const { textAlign, pickedTextAlign } = delegate;

  return (
    <div className={sharedStyles.flexColumn}>
      <div className={fontStyles.labelRow}>
        <label htmlFor="text-align">
          <strong>Text alignment</strong>
        </label>
        <FieldHint text={DESCRIPTION} />
      </div>
      <div
        id="text-align"
        className={fieldStyles.segmented}
        role="group"
        aria-label="Text alignment"
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
