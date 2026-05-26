import { PRICING_FAQ } from '../pricingFaq';
import styles from './PricingFaq.module.css';

export function PricingFaq() {
  return (
    <section className={styles.faq} aria-labelledby="pricing-faq-heading">
      <h2 id="pricing-faq-heading" className={styles.heading}>
        Questions &amp; answers
      </h2>
      <div className={styles.list}>
        {PRICING_FAQ.map((item) => (
          <details key={item.question} className={styles.item}>
            <summary className={styles.summary}>
              <span>{item.question}</span>
              <span className={styles.icon} aria-hidden="true" />
            </summary>
            <p className={styles.answer}>{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
