import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styles from '../../../styles/shared.module.css';

interface LoggedInSuccessProps {
  firstName?: string;
}

export const LoggedInSuccess = ({ firstName }: LoggedInSuccessProps) => {
  const { t } = useTranslation('account');
  const navigate = useNavigate();
  const subhead = firstName
    ? t('checkout.thanksActive', { firstName })
    : t('checkout.subscriptionActive');

  return (
    <div className={`${styles.card} ${styles.textCenter}`}>
      <h1 className={styles.title}>{t('checkout.youreOnUnlimited')}</h1>
      <p className={styles.subtitle}>{subhead}</p>
      <div className={`${styles.flexColumn} ${styles.marginTopLg}`}>
        <button
          type="button"
          className={`${styles.btnPrimary} ${styles.btnInline}`}
          onClick={() => navigate('/upload')}
        >
          {t('checkout.makeDeck')}
        </button>
        <a
          href="/account"
          className={`${styles.btnSecondary} ${styles.marginTopSm}`}
        >
          {t('checkout.goToAccount')}
        </a>
      </div>
    </div>
  );
};
