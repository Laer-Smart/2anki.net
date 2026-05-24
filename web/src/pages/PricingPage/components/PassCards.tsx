import { PricingCard } from './PricingCard';
import styles from '../PricingPage.module.css';

const PASS_BENEFITS = [
  'No subscription',
  'Unlimited conversions',
  'All upload formats — Notion, .zip, .html, .md, .csv, .apkg',
  'Image occlusion',
  'Custom card templates',
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
        badge="Pay once"
        badgeMuted
        price="$4"
        priceSuffix="— 24 hours"
        benefits={PASS_BENEFITS}
        onAction={onDayPass}
        actionLabel={dayPassPending ? 'Redirecting…' : 'Get Day Pass'}
        actionDisabled={dayPassPending}
        variant="outline"
      />
      <PricingCard
        title="Week Pass"
        badge="Pay once"
        badgeMuted
        price="$9"
        priceSuffix="— 1 week"
        benefits={PASS_BENEFITS}
        onAction={onWeekPass}
        actionLabel={weekPassPending ? 'Redirecting…' : 'Get Week Pass'}
        actionDisabled={weekPassPending}
        variant="outline"
      />
    </div>
  );
}
