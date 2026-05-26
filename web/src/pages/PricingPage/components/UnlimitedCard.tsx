import styles from '../PricingPage.module.css';

interface UnlimitedCardProps {
  isLoggedIn: boolean;
  billingCycle: 'month' | 'year';
  onBillingCycleChange: (cycle: 'month' | 'year') => void;
  yearlyAvailable: boolean;
  onUpgrade: () => void;
  pending: boolean;
}

function CheckIcon() {
  return (
    <svg
      className={styles.benefitIcon}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3.5 8.5l3 3 6-6.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const BENEFITS = [
  'Unlimited flashcards',
  'Run multiple conversions at once',
  'PDFs and large Notion exports',
  'Unlimited Anki → Notion imports',
  'Print decks to PDF',
  'No ads',
  'Cancel anytime',
];

export function UnlimitedCard({
  billingCycle,
  onBillingCycleChange,
  yearlyAvailable,
  onUpgrade,
  pending,
}: Readonly<UnlimitedCardProps>) {
  const isYearly = billingCycle === 'year';
  const price = isYearly ? '$60' : '$6';
  const priceSuffix = isYearly ? '/ yr' : '/ mo';

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <p className={styles.cardTitle}>Unlimited</p>
        {yearlyAvailable && (
          <div
            role="radiogroup"
            aria-label="Billing cycle"
            className={styles.billingToggle}
          >
            <button
              type="button"
              role="radio"
              aria-checked={!isYearly}
              className={isYearly ? styles.billingToggleOption : styles.billingToggleOptionActive}
              onClick={() => onBillingCycleChange('month')}
            >
              Monthly
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={isYearly}
              className={isYearly ? styles.billingToggleOptionActive : styles.billingToggleOption}
              onClick={() => onBillingCycleChange('year')}
            >
              Yearly
            </button>
          </div>
        )}
        <span className={styles.cardPriceLine}>
          <span className={styles.cardPrice}>{price}</span>
          <span className={styles.cardPriceSuffix}>{priceSuffix}</span>
        </span>
        {isYearly && (
          <p className={styles.yearlyHint}>2 months free</p>
        )}
      </div>
      <div className={styles.cardBody}>
        {BENEFITS.map((benefit) => (
          <p key={benefit} className={styles.benefit}>
            <CheckIcon />
            <span>{benefit}</span>
          </p>
        ))}
      </div>
      <div className={styles.cardFooter}>
        <button
          type="button"
          className={styles.cardButton}
          onClick={onUpgrade}
          disabled={pending}
        >
          {pending ? 'Starting checkout' : 'Upgrade'}
        </button>
      </div>
    </div>
  );
}
