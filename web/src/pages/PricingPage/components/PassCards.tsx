import { PricingCard } from './PricingCard';
import styles from '../PricingPage.module.css';

const PASS_BENEFITS = [
  'No subscription',
  'Unlimited cards and conversions',
  'Unlimited image occlusion',
  'Larger uploads — up to 10 GB',
  'No ads',
];

interface PassCardsProps {
  onDayPass: () => void;
  onWeekPass: () => void;
  dayPassPending: boolean;
  weekPassPending: boolean;
}

export function PassCards({
  onDayPass,
  onWeekPass,
  dayPassPending,
  weekPassPending,
}: Readonly<PassCardsProps>) {
  return (
    <div className={styles.passGrid}>
      <PricingCard
        title="Day Pass"
        badge="Most popular"
        price="$4"
        priceSuffix="— 24 hours"
        benefits={PASS_BENEFITS}
        onAction={onDayPass}
        actionLabel={dayPassPending ? 'Redirecting…' : 'Get Day Pass'}
        actionDisabled={dayPassPending}
        className={styles.cardPro}
      />
      <PricingCard
        title="Week Pass"
        price="$9"
        priceSuffix="— 1 week"
        benefits={PASS_BENEFITS}
        onAction={onWeekPass}
        actionLabel={weekPassPending ? 'Redirecting…' : 'Get Week Pass'}
        actionDisabled={weekPassPending}
      />
    </div>
  );
}
