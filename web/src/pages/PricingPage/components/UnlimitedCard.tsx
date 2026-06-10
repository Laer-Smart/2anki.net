import styles from '../PricingPage.module.css';
import {
  annualSavingsPercent,
  formatAnnual,
  formatAnnualPerMonth,
  formatMonthly,
} from '../pricing.constants';

interface UnlimitedCardProps {
  isLoggedIn: boolean;
  billingCycle: 'month' | 'year';
  onBillingCycleChange: (cycle: 'month' | 'year') => void;
  yearlyAvailable: boolean;
  onUpgrade: () => void;
  pending: boolean;
  monthlyCents: number;
  annualCents: number;
  error?: boolean;
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
  'Native .apkg — works in any Anki client',
  'AI flashcards, photo-to-deck, and chat',
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
  monthlyCents,
  annualCents,
  error = false,
}: Readonly<UnlimitedCardProps>) {
  const isYearly = billingCycle === 'year';
  const savings = annualSavingsPercent(monthlyCents, annualCents);
  const heroPrice = isYearly
    ? formatAnnualPerMonth(annualCents)
    : formatMonthly(monthlyCents);
  const annualTotal = formatAnnual(annualCents);
  const monthlyTotal = formatMonthly(monthlyCents);

  const terms = isYearly
    ? `${annualTotal}/year, renews annually. Cancel anytime.`
    : `${monthlyTotal}/month, renews monthly. Cancel anytime.`;

  function getButtonLabel(): string {
    if (error) return 'Try again';
    if (pending) return 'Starting checkout';
    return 'Get Unlimited';
  }

  return (
    <div className={`${styles.card} ${styles.cardPro}`}>
      <span className={styles.cardBadge}>Most popular</span>
      <div className={styles.cardHeader}>
        <p className={styles.cardTitle}>Unlimited</p>
        <span className={styles.cardPriceLine}>
          <span className={styles.cardPrice}>{heroPrice}</span>
          <span className={styles.cardPriceSuffix}>/ mo</span>
        </span>
        {isYearly ? (
          <p className={styles.yearlyHint}>
            {annualTotal}/year billed yearly · save {savings}%
          </p>
        ) : (
          <p className={styles.yearlyHint}>billed monthly</p>
        )}
        {yearlyAvailable && (
          <div
            role="radiogroup"
            aria-label="Billing cycle"
            className={styles.billingToggle}
          >
            <button
              type="button"
              role="radio"
              aria-checked={isYearly}
              className={
                isYearly
                  ? styles.billingToggleOptionActive
                  : styles.billingToggleOption
              }
              onClick={() => onBillingCycleChange('year')}
            >
              Yearly · save {savings}%
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={!isYearly}
              className={
                isYearly
                  ? styles.billingToggleOption
                  : styles.billingToggleOptionActive
              }
              onClick={() => onBillingCycleChange('month')}
            >
              Monthly
            </button>
          </div>
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
          {getButtonLabel()}
        </button>
        {error ? (
          <p className={styles.cardCaption}>
            Couldn't start checkout. Try again, or email support@2anki.net.
          </p>
        ) : (
          <p className={styles.cardTerms}>{terms}</p>
        )}
      </div>
    </div>
  );
}
