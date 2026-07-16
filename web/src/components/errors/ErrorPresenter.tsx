import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { classifyError } from './helpers/getErrorMessage';
import { useDismissed } from './helpers/useDismissed';
import styles from '../../styles/shared.module.css';

interface ErrorPresenterProps {
  error: unknown;
  onRetry?: () => void;
}

export function ErrorPresenter({
  error,
  onRetry,
}: Readonly<ErrorPresenterProps>) {
  const { t } = useTranslation('errors');
  const { dismissed, setDismissed } = useDismissed(error);

  if (!error || dismissed) {
    return null;
  }

  const { title, detail, actionLink } = classifyError(error);

  return (
    <article className={styles.alertInfo}>
      <div className={styles.modalBody}>
        <p>
          <strong>{title}</strong>
        </p>
        {detail && <p className={styles.smallDescription}>{detail}</p>}
      </div>
      <div className={styles.modalFooter}>
        {actionLink && (
          <Link
            to={actionLink.to}
            className={styles.btnPrimary}
            onClick={() => setDismissed(true)}
          >
            {actionLink.text}
          </Link>
        )}
        {onRetry && (
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={() => {
              setDismissed(true);
              onRetry();
            }}
          >
            {t('presenter.tryAgain')}
          </button>
        )}
        <button
          type="button"
          className={styles.btnSecondary}
          onClick={() => setDismissed(true)}
        >
          {t('presenter.dismiss')}
        </button>
      </div>
    </article>
  );
}
