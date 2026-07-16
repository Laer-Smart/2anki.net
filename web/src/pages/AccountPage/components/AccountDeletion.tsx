import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDialog } from '../../../lib/hooks/useDialog';
import sharedStyles from '../../../styles/shared.module.css';
import styles from '../AccountPage.module.css';

export function AccountDeletion() {
  const { t } = useTranslation('account');
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
      <h4 className={styles.dangerTitle}>
        {t('accountDeletion.deleteAccount')}
      </h4>
      <div className={styles.dangerNotice}>{t('accountDeletion.warning')}</div>
      <button
        ref={triggerRef}
        type="button"
        className={styles.dangerButton}
        onClick={() => setIsOpen(true)}
      >
        {t('accountDeletion.deleteAccount')}
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
              {t('accountDeletion.deleteAccountQuestion')}
            </h4>
            <button
              type="button"
              aria-label={t('accountDeletion.close')}
              onClick={close}
              className={sharedStyles.modalClose}
            >
              &times;
            </button>
          </div>
          <section className={sharedStyles.modalBody}>
            {t('accountDeletion.warning')}
          </section>
          <div className={sharedStyles.modalFooter}>
            <button
              ref={cancelRef}
              type="button"
              className={sharedStyles.btnSecondary}
              onClick={close}
            >
              {t('accountDeletion.cancel')}
            </button>
            <button
              type="button"
              className={sharedStyles.btnDanger}
              onClick={() => navigate('/delete-account')}
            >
              {t('accountDeletion.deleteAccount')}
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
