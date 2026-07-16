import { useTranslation } from 'react-i18next';

import styles from '../../styles/shared.module.css';
import pageStyles from './SecurityPage.module.css';

export default function SecurityPage() {
  const { t } = useTranslation('marketing');
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t('security.title')}</h1>

      <section className={pageStyles.section}>
        <h2>{t('security.reportTitle')}</h2>
        <p>{t('security.reportBody')}</p>
      </section>

      <section className={pageStyles.section}>
        <h2>{t('security.includeTitle')}</h2>
        <p>{t('security.includeBody')}</p>
      </section>

      <section className={pageStyles.section}>
        <h2>{t('security.scopeTitle')}</h2>
        <p>{t('security.scopeIn')}</p>
        <p>{t('security.scopeOut')}</p>
      </section>

      <section className={pageStyles.section}>
        <h2>{t('security.responseTitle')}</h2>
        <p>{t('security.responseBody')}</p>
      </section>

      <section className={pageStyles.section}>
        <h2>{t('security.rewardsTitle')}</h2>
        <p>{t('security.rewardsBody')}</p>
      </section>

      <section className={pageStyles.section}>
        <h2>{t('security.ackTitle')}</h2>
        <ul>
          <li>
            <a
              href="https://github.com/endscene665"
              target="_blank"
              rel="noopener noreferrer"
            >
              endscene665
            </a>
            {t('security.ackItem1')}
          </li>
        </ul>
      </section>
    </div>
  );
}
