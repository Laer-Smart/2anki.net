import Confetti from 'react-confetti';
import { useTranslation } from 'react-i18next';
import styles from '../../../styles/shared.module.css';

export const LoadingState = () => {
  const { t } = useTranslation('account');
  return (
    <div className={`${styles.pageNarrow} ${styles.textCenter}`}>
      <h1 className={styles.title}>{t('checkout.processingPayment')}</h1>
      <div className={`${styles.flexCenter} ${styles.spinnerContainer}`}>
        <div className={styles.spinner} />
      </div>
      <p className={styles.subtitle}>{t('checkout.activatingSubscription')}</p>
      <p className={styles.secondaryText}>{t('checkout.autoRedirect')}</p>
      <Confetti
        width={window.innerWidth}
        height={window.innerHeight}
        gravity={0.05}
        recycle={false}
      />
    </div>
  );
};
