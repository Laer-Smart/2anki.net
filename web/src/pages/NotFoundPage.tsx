import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import styles from '../styles/shared.module.css';

function NotFoundPage() {
  const { t } = useTranslation('errors');
  return (
    <div className={`${styles.pageNarrow} ${styles.textCenter}`}>
      <Helmet>
        <title>{t('notFound.pageTitle')}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className={styles.emptyState}>
        <img src="/mascot/Notion 1.png" alt="" className={styles.mascot404} />
        <h1 className={styles.title}>{t('notFound.title')}</h1>
        <p className={styles.secondaryText}>{t('notFound.description')}</p>
        <p>
          <a href="/" className={`${styles.btnPrimary} ${styles.btnInline}`}>
            {t('notFound.cta')}
          </a>
        </p>
      </div>
    </div>
  );
}

export default NotFoundPage;
