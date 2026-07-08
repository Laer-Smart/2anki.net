import styles from '../AccountPage.module.css';

interface PlanDetailsProps {
  readonly subscriptionType: 'subscriber' | 'lifetime' | 'free';
}

export function PlanDetails({ subscriptionType }: PlanDetailsProps) {
  if (subscriptionType === 'lifetime') {
    return (
      <section className={styles.section}>
        <p className={styles.planTier}>Lifetime</p>
        <p className={styles.planMeta}>All current and future features.</p>
      </section>
    );
  }

  if (subscriptionType === 'subscriber') {
    return (
      <section className={styles.section}>
        <p className={styles.planTier}>Premium</p>
        <p className={styles.planMeta}>Unlimited cards, all formats.</p>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <p className={styles.planTier}>Free</p>
      <p className={styles.planMeta}>100 cards per month.</p>
      <a href="/pricing" className={styles.primaryButton}>
        See plans
      </a>
    </section>
  );
}
