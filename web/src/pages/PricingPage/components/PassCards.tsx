import { PricingCard } from './PricingCard';
import styles from '../PricingPage.module.css';

const PASS_BENEFITS = [
  'No subscription',
  'Unlimited cards and conversions',
  'AI flashcards & photo-to-deck',
  'Every file format — PDF, Word, EPUB, and more',
  'Native .apkg — works in any Anki client',
  'Unlimited image occlusion',
  'No ads',
];

interface PassCardsProps {
  onDayPass: () => void;
  onWeekPass: () => void;
  dayPassPending: boolean;
  weekPassPending: boolean;
  featureDayPass?: boolean;
}

export function PassCards({
  onDayPass,
  onWeekPass,
  dayPassPending,
  weekPassPending,
  featureDayPass = true,
}: Readonly<PassCardsProps>) {
  return (
    <div className={styles.passGrid}>
      <PricingCard
        title="Day Pass"
        badge={featureDayPass ? 'Most popular' : 'Pay once'}
        badgeMuted={!featureDayPass}
        price="$4"
        priceSuffix="— 24 hours"
        benefits={PASS_BENEFITS}
        onAction={onDayPass}
        actionLabel={dayPassPending ? 'Redirecting…' : 'Get Day Pass'}
        actionDisabled={dayPassPending}
        className={featureDayPass ? styles.cardPro : undefined}
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
