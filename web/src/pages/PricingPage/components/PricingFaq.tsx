import { useTranslation } from 'react-i18next';

import { PRICING_FAQ } from '../pricingFaq';
import styles from './PricingFaq.module.css';

export function PricingFaq() {
  const { t } = useTranslation('pricingtable');

  return (
    <section className={styles.faq} aria-labelledby="pricing-faq-heading">
      <h2 id="pricing-faq-heading" className={styles.heading}>
        {t('faq.heading')}
      </h2>
      <div className={styles.list}>
        {PRICING_FAQ.map((item) => (
          <details key={item.questionKey} className={styles.item}>
            <summary className={styles.summary}>
              <span>{t(item.questionKey)}</span>
              <span className={styles.icon} aria-hidden="true" />
            </summary>
            <p className={styles.answer}>
              {t(item.answerKey, item.answerValues)}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
