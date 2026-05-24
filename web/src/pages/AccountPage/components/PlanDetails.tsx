import styles from '../AccountPage.module.css';

interface PlanDetailsProps {
  readonly subscriptionType: 'subscriber' | 'lifetime' | 'free';
}

export function PlanDetails({ subscriptionType }: PlanDetailsProps) {
  if (subscriptionType === 'lifetime') {
    return (
      <section className={styles.section}>
        <p className={styles.planLine}>Lifetime access.</p>
        <p className={styles.muted}>Thanks for backing 2anki.</p>
      </section>
    );
  }

  if (subscriptionType === 'subscriber') {
    return (
      <section className={styles.section}>
        <p className={styles.planLine}>Pro subscription.</p>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <p className={styles.planLine}>Free — 100 cards per month.</p>
      <a href="/pricing" className={styles.primaryButton}>
        Upgrade
      </a>
    </section>
  );
}
