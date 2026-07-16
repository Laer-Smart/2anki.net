import { useTranslation } from 'react-i18next';
import styles from '../../../styles/shared.module.css';

interface TimeoutWarningProps {
  show: boolean;
}

export const TimeoutWarning = ({ show }: TimeoutWarningProps) => {
  const { t } = useTranslation('account');
  if (!show) return null;

  return (
    <div className={styles.notificationWarning}>
      <p>
        <strong>{t('checkout.note')}</strong>
        {t('checkout.timeoutBefore')}
        <a href="/notion">{t('checkout.notionPage')}</a>
        {t('checkout.timeoutAfter')}
      </p>
    </div>
  );
};
