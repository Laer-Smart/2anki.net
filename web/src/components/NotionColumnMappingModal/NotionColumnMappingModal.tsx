import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
            {t('modals.columnMapping.title')}
          </span>
          <button
            type="button"
            aria-label={t('modals.columnMapping.cancel')}
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
                {t('modals.columnMapping.front')}
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
                {t('modals.columnMapping.back')}
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
                {t('modals.columnMapping.differentColumns')}
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
            {t('modals.columnMapping.cancel')}
          </button>
          <button
            type="button"
            className={sharedStyles.btnPrimary}
            onClick={handleSubmit}
            disabled={sameColumn}
          >
            {t('modals.columnMapping.convert')}
          </button>
        </div>
      </div>
    </dialog>
  );
}
