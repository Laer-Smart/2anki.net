import React from 'react';
import type { FieldMapping, FieldMappingEntry } from '../../lib/cardFields/types';
import fieldStyles from './CardOptionsForm.module.css';

interface Props {
  mapping: FieldMapping;
  onChange: (updated: FieldMapping) => void;
}

export function FieldMappingPanel({ mapping, onChange }: Readonly<Props>) {
  function handleInstructionChange(index: number, value: string) {
    const updatedFields: FieldMappingEntry[] = mapping.fields.map((f, i) =>
      i === index ? { ...f, instruction: value } : f
    );
    onChange({ ...mapping, fields: updatedFields });
  }

  return (
    <div className={fieldStyles.section}>
      <p className={fieldStyles.sectionHint}>
        Tell the AI what to put in each field of your card template. Leave a field blank to let the AI decide.
      </p>
      {mapping.fields.map((field, i) => (
        <div key={field.name} className={fieldStyles.section}>
          <div className={fieldStyles.labelRow}>
            <label htmlFor={`field-mapping-${field.name}`} className={fieldStyles.sectionLabel}>
              {field.name}
            </label>
          </div>
          <input
            id={`field-mapping-${field.name}`}
            className={fieldStyles.deckInput}
            value={field.instruction}
            placeholder={`What goes in ${field.name}?`}
            onChange={(e) => handleInstructionChange(i, e.target.value)}
          />
        </div>
      ))}
    </div>
  );
}
