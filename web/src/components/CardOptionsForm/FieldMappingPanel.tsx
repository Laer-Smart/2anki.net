import React from 'react';
import { useTranslation } from 'react-i18next';
import type {
  FieldMapping,
  FieldMappingEntry,
} from '../../lib/cardFields/types';
import fieldStyles from './CardOptionsForm.module.css';

interface Props {
  mapping: FieldMapping;
  onChange: (updated: FieldMapping) => void;
}

export function FieldMappingPanel({ mapping, onChange }: Readonly<Props>) {
  const { t } = useTranslation('chrome');

  function handleInstructionChange(index: number, value: string) {
    const updatedFields: FieldMappingEntry[] = mapping.fields.map((f, i) =>
      i === index ? { ...f, instruction: value } : f
    );
    onChange({ ...mapping, fields: updatedFields });
  }

  return (
    <div className={fieldStyles.section}>
      <details>
        <summary className={fieldStyles.detailsSummary}>
          {t('fieldMapping.summary')}
        </summary>
        <p className={fieldStyles.sectionHint}>{t('fieldMapping.hint')}</p>
        {mapping.fields.map((field, i) => (
          <div key={field.name} className={fieldStyles.section}>
            <div className={fieldStyles.labelRow}>
              <label
                htmlFor={`field-mapping-${field.name}`}
                className={fieldStyles.sectionLabel}
              >
                {field.name}
              </label>
            </div>
            <input
              id={`field-mapping-${field.name}`}
              className={fieldStyles.deckInput}
              value={field.instruction}
              placeholder={t('fieldMapping.placeholder', { field: field.name })}
              onChange={(e) => handleInstructionChange(i, e.target.value)}
            />
          </div>
        ))}
      </details>
    </div>
  );
}
