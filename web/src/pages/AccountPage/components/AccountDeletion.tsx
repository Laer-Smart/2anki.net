import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDialog } from '../../../lib/hooks/useDialog';
import sharedStyles from '../../../styles/shared.module.css';
import styles from '../AccountPage.module.css';

export function AccountDeletion() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  const close = () => setIsOpen(false);
  const dialogRef = useDialog(isOpen, close);

  useEffect(() => {
    if (isOpen) {
      cancelRef.current?.focus();
    } else {
      triggerRef.current?.focus();
    }
  }, [isOpen]);

  return (
    <div className={styles.dangerSection}>
      <h4 className={styles.dangerTitle}>Delete account</h4>
      <div className={styles.dangerNotice}>
        All your data will be permanently deleted. This cannot be undone.
      </div>
      <button
        ref={triggerRef}
        type="button"
        className={styles.dangerButton}
        onClick={() => setIsOpen(true)}
      >
        Delete account
      </button>
      <dialog
        ref={dialogRef}
        className={sharedStyles.dialog}
        aria-labelledby="delete-account-dialog-title"
      >
        <div className={sharedStyles.modalCardNarrow}>
          <div className={sharedStyles.modalHeader}>
            <h4
              id="delete-account-dialog-title"
              className={sharedStyles.modalHeaderTitle}
            >
              Delete account?
            </h4>
            <button
              type="button"
              aria-label="close"
              onClick={close}
              className={sharedStyles.modalClose}
            >
              &times;
            </button>
          </div>
          <section className={sharedStyles.modalBody}>
            All your data will be permanently deleted. This cannot be undone.
          </section>
          <div className={sharedStyles.modalFooter}>
            <button
              ref={cancelRef}
              type="button"
              className={sharedStyles.btnSecondary}
              onClick={close}
            >
              Cancel
            </button>
            <button
              type="button"
              className={sharedStyles.btnDanger}
              onClick={() => navigate('/delete-account')}
            >
              Delete account
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
