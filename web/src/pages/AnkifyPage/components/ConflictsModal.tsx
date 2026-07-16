import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import styles from '../AnkifyPage.module.css';
import { Backend } from '../../../lib/backend/Backend';
import SyncConflicts from './SyncConflicts';

interface Props {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly backend?: Backend;
}

export default function ConflictsModal({ open, onClose, backend }: Props) {
  const { t } = useTranslation('ankify');
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog == null) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className={styles.conflictsModal}
      onClose={onClose}
      onCancel={onClose}
    >
      <div className={styles.conflictsModalCard}>
        <div className={styles.conflictsModalHead}>
          <h2 className={styles.workspaceTitle}>{t('conflicts.modalTitle')}</h2>
          <button
            type="button"
            className={styles.conflictsModalClose}
            onClick={onClose}
            aria-label={t('conflicts.closeModal')}
          >
            ×
          </button>
        </div>
        <SyncConflicts backend={backend} embedded />
      </div>
    </dialog>
  );
}
