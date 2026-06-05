import { useState, useCallback } from 'react';
import { useDialog } from '../../lib/hooks/useDialog';
import type {
  AmbiguousColumnsPayload,
  FieldMapping,
} from '../../lib/fieldMapping/types';
import sharedStyles from '../../styles/shared.module.css';
import styles from './NotionColumnMappingModal.module.css';

interface Props {
  isOpen: boolean;
  columns: AmbiguousColumnsPayload['columns'];
  suggested: AmbiguousColumnsPayload['suggested'];
  onSubmit: (mapping: FieldMapping) => void;
  onCancel: () => void;
}

export function NotionColumnMappingModal({
  isOpen,
  columns,
  suggested,
  onSubmit,
  onCancel,
}: Readonly<Props>) {
  const [frontField, setFrontField] = useState<string>(
    suggested.frontField ?? columns[0] ?? ''
  );
  const [backField, setBackField] = useState<string>(
    suggested.backField ?? columns[1] ?? ''
  );

  const handleCancel = useCallback(() => onCancel(), [onCancel]);
  const dialogRef = useDialog(isOpen, handleCancel);

  const sameColumn = frontField !== '' && frontField === backField;

  const handleSubmit = () => {
    if (sameColumn) return;
    onSubmit({ frontField, backField });
  };

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      className={sharedStyles.dialog}
      aria-labelledby="column-mapping-title"
    >
      <div className={sharedStyles.modalCard}>
        <div className={sharedStyles.modalHeader}>
          <span
            id="column-mapping-title"
            className={sharedStyles.modalHeaderTitle}
          >
            Map your columns
          </span>
          <button
            type="button"
            aria-label="Cancel"
            className={sharedStyles.modalClose}
            onClick={onCancel}
          >
            &times;
          </button>
        </div>

        <div className={sharedStyles.modalBody}>
          <div className={styles.form}>
            <div className={styles.fieldRow}>
              <label htmlFor="column-mapping-front" className={styles.label}>
                Front
              </label>
              <select
                id="column-mapping-front"
                className={styles.select}
                value={frontField}
                onChange={(e) => setFrontField(e.target.value)}
              >
                {columns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.fieldRow}>
              <label htmlFor="column-mapping-back" className={styles.label}>
                Back
              </label>
              <select
                id="column-mapping-back"
                className={styles.select}
                value={backField}
                onChange={(e) => setBackField(e.target.value)}
              >
                {columns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>

            {sameColumn && (
              <p className={styles.validationError} role="alert">
                Front and back must be different columns.
              </p>
            )}
          </div>
        </div>

        <div className={sharedStyles.modalFooter}>
          <button
            type="button"
            className={sharedStyles.btnSecondary}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className={sharedStyles.btnPrimary}
            onClick={handleSubmit}
            disabled={sameColumn}
          >
            Convert with this mapping
          </button>
        </div>
      </div>
    </dialog>
  );
}
