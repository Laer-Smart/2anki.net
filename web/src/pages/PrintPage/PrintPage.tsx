import { useTranslation } from 'react-i18next';
import styles from '../../styles/shared.module.css';
import { useUserLocals } from '../../lib/hooks/useUserLocals';
import { isPayingUser } from '../../components/NavigationBar/helpers/getPlanLabel';
import PrintForm from './components/PrintForm';

export function PrintPage() {
  const { t } = useTranslation('tools');
  const { data } = useUserLocals();
  const paying = isPayingUser(data?.locals);
  const freePrintAvailable = data?.freePrintAvailable;

  let statusLine: string | null = null;
  if (!paying) {
    if (freePrintAvailable === false) {
      statusLine = t('print.statusUsed');
    } else if (freePrintAvailable === true) {
      statusLine = t('print.statusFree');
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <h1 className={styles.title}>{t('print.title')}</h1>
        <p className={styles.subtitle}>{t('print.subtitle')}</p>
      </header>
      {statusLine != null && (
        <p className={styles.smallDescription}>{statusLine}</p>
      )}
      <PrintForm />
      <p className={styles.smallDescription}>{t('print.autoDelete')}</p>
    </div>
  );
}
