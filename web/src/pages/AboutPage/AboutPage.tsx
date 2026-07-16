import { useTranslation } from 'react-i18next';

import styles from '../../styles/shared.module.css';
import pageStyles from './AboutPage.module.css';

export default function AboutPage() {
  const { t } = useTranslation('marketing');
  return (
    <div className={styles.page}>
      <header className={styles.pageHeaderCenter}>
        <h1 className={styles.title}>{t('about.title')}</h1>
        <p className={styles.subtitle}>{t('about.subtitle')}</p>
      </header>

      <section className={pageStyles.hero}>
        <p>{t('about.heroBody')}</p>
        <a href="/upload" className={pageStyles.ctaButton}>
          {t('about.convertFile')}
        </a>
      </section>

      <section className={pageStyles.steps}>
        <h2 className={styles.subHeading}>{t('about.howItWorks')}</h2>
        <ol className={pageStyles.stepList}>
          <li className={pageStyles.step}>
            <span className={pageStyles.stepNumber}>1</span>
            <div>
              <strong>{t('about.step1Title')}</strong>
              <p>{t('about.step1Body')}</p>
            </div>
          </li>
          <li className={pageStyles.step}>
            <span className={pageStyles.stepNumber}>2</span>
            <div>
              <strong>{t('about.step2Title')}</strong>
              <p>{t('about.step2Body')}</p>
            </div>
          </li>
          <li className={pageStyles.step}>
            <span className={pageStyles.stepNumber}>3</span>
            <div>
              <strong>{t('about.step3Title')}</strong>
              <p>{t('about.step3Body')}</p>
            </div>
          </li>
        </ol>
        <p className={pageStyles.stepsFooter}>
          {t('about.walkthroughPrefix')}{' '}
          <a href="/documentation/start-here/what-is-2anki">
            {t('about.walkthroughLink')}
          </a>
        </p>
      </section>

      <section className={pageStyles.philosophy}>
        <h2 className={styles.subHeading}>{t('about.philosophyTitle')}</h2>
        <p>
          {t('about.philosophyPrefix')}
          <a
            href="https://www.super-memory.com/"
            target="_blank"
            rel="noreferrer"
          >
            SuperMemo
          </a>
          {t('about.philosophySuffix')}
        </p>
        <p>{t('about.philosophyQuota')}</p>
      </section>
    </div>
  );
}
