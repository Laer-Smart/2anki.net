import { SyntheticEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { ErrorHandlerType } from '../../errors/helpers/getErrorMessage';
import { getVisibleText } from '../../../lib/text/getVisibleText';
import { useDialog } from '../../../lib/hooks/useDialog';
import { CardOptionsForm } from '../../CardOptionsForm/CardOptionsForm';
import sharedStyles from '../../../styles/shared.module.css';
import styles from './SettingsModal.module.css';

interface Props {
  pageTitle?: string;
  pageId: string | null;
  isActive: boolean;
  onClickClose: (event?: SyntheticEvent) => void;
  setError: ErrorHandlerType;
}

function SettingsModal({
  pageTitle,
  pageId,
  isActive,
  onClickClose,
  setError,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const location = useLocation();
  const returnTo = `${location.pathname}${location.search}`;

  const params = new URLSearchParams();
  if (pageId) params.set('pageId', pageId);
  if (pageTitle) params.set('title', pageTitle);
  params.set('returnTo', returnTo);
  const fullPageHref = `/card-options?${params.toString()}`;

  const dialogRef = useDialog(isActive, () => onClickClose());

  return (
    <dialog
      ref={dialogRef}
      className={sharedStyles.dialog}
      aria-labelledby="settings-modal-title"
    >
      <div className={sharedStyles.modalCard}>
        <div className={sharedStyles.modalHeader}>
          <div
            id="settings-modal-title"
            className={sharedStyles.modalHeaderTitle}
          >
            {getVisibleText('card.options')}
          </div>
          <div className={styles.headerActions}>
            <Link to={fullPageHref} className={styles.openFullPage}>
              {t('settings.openFullPage')}
            </Link>
            <button
              type="button"
              aria-label={t('settings.close')}
              onClick={onClickClose}
              className={sharedStyles.modalClose}
            >
              &times;
            </button>
          </div>
        </div>
        <section className={sharedStyles.modalBody}>
          <CardOptionsForm
            pageTitle={pageTitle}
            pageId={pageId}
            onSaved={onClickClose}
            onReset={() => onClickClose()}
            setError={setError}
          />
        </section>
      </div>
    </dialog>
  );
}

SettingsModal.defaultProps = {
  pageTitle: null,
};

export default SettingsModal;
