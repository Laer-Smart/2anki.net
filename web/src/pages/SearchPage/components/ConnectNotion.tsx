import { useTranslation } from 'react-i18next';
import shared from '../../../styles/shared.module.css';
import styles from './ConnectNotion.module.css';

interface Props {
  ready: boolean;
  connectionLink: string;
}

export default function ConnectNotion({
  ready,
  connectionLink,
}: Readonly<Props>) {
  const { t } = useTranslation('search');
  if (!ready) return null;

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <h3 className={styles.title}>{t('connect.title')}</h3>
        <p className={styles.body}>{t('connect.body')}</p>
        <a className={shared.btnPrimary} href={connectionLink}>
          {t('connect.connectButton')}
        </a>
      </div>
      <div className={styles.fallback}>
        <p className={styles.fallbackText}>{t('connect.fallbackText')}</p>
        <a
          className={`${shared.btnSecondary} ${styles.fallbackAction}`}
          href="/upload"
        >
          {t('connect.uploadFile')}
        </a>
      </div>
    </div>
  );
}
