import { useTranslation } from 'react-i18next';
import sharedStyles from '../../styles/shared.module.css';
import { FieldHint } from '../FieldHint';
import { NoteTypeOption } from './useAvailableNoteTypes';

interface NoteTypePickerProps {
  label: string;
  name: string;
  value: string;
  placeholder: string;
  options: NoteTypeOption[];
  loading: boolean;
  onChange: (value: string) => void;
  hint?: string;
}

export function NoteTypePicker({
  label,
  name,
  value,
  placeholder,
  options,
  loading,
  onChange,
  hint,
}: Readonly<NoteTypePickerProps>) {
  const { t } = useTranslation('chrome');
  const selectedIsCustom =
    value.length > 0 && !options.some((option) => option.value === value);

  const groupedByOrigin = {
    user: options.filter((o) => o.origin === 'user'),
    official: options.filter((o) => o.origin === 'official'),
    starter: options.filter((o) => o.origin === 'starter'),
  };

  return (
    <div>
      <div className={sharedStyles.fieldHeader}>
        <label htmlFor={name} className={sharedStyles.fieldLabel}>
          {label}
        </label>
        {hint && <FieldHint text={hint} />}
      </div>
      <select
        id={name}
        name={name}
        className={sharedStyles.select}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={loading}
      >
        <option value="">{placeholder}</option>
        {groupedByOrigin.user.length > 0 && (
          <optgroup label={t('noteType.yourNoteTypes')}>
            {groupedByOrigin.user.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </optgroup>
        )}
        {groupedByOrigin.official.length > 0 && (
          <optgroup label={t('noteType.officialTemplates')}>
            {groupedByOrigin.official.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </optgroup>
        )}
        {groupedByOrigin.starter.length > 0 && (
          <optgroup label={t('noteType.starterNoteTypes')}>
            {groupedByOrigin.starter.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </optgroup>
        )}
        {selectedIsCustom && (
          <option value={value}>{t('noteType.custom', { value })}</option>
        )}
      </select>
    </div>
  );
}

export default NoteTypePicker;
