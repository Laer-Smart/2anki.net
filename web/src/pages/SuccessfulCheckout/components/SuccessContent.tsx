import { useTranslation } from 'react-i18next';
import { UserActionCards } from './UserActionCards';
import { TimeoutWarning } from './TimeoutWarning';
import styles from '../../../styles/shared.module.css';

const settingsLink = 'https://2anki.net/settings';
const supportLink = 'mailto:support@2anki.net';

interface SuccessContentProps {
  timeoutReached: boolean;
}

export const SuccessContent = ({ timeoutReached }: SuccessContentProps) => {
  const { t } = useTranslation('account');
  return (
    <>
      <h1 className={styles.title}>{t('checkout.paymentConfirmed')}</h1>

      <p>
        {t('checkout.startUsingPrefix')}
        <strong>{t('checkout.sameEmailAddress')}</strong>
        {t('checkout.startUsingSuffix')}
      </p>

      <UserActionCards />

      <p>
        <strong>{t('checkout.usedDifferentEmail')}</strong>
      </p>
      <p>
        {t('checkout.linkEmailsPrefix')}
        <a href={settingsLink}>{t('checkout.settingsPage')}</a>
        {t('checkout.linkEmailsSuffix')}
      </p>

      <p>
        {t('checkout.troubleLoggingIn')}
        <a href={supportLink}>support@2anki.net</a>.
      </p>

      <TimeoutWarning show={timeoutReached} />
    </>
  );
};
