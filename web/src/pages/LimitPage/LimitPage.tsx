import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { track } from '../../lib/analytics/track';
import { get2ankiApi } from '../../lib/backend/get2ankiApi';
import { getSubscribeLink } from '../PricingPage/payment.links';
import { PassCards } from '../PricingPage/components/PassCards';
import { useUserLocals } from '../../lib/hooks/useUserLocals';
import {
  AUTO_SYNC_PRICE,
  MONTHLY_PRICE,
  MONTHLY_SUFFIX,
} from '../PricingPage/pricing.constants';
import styles from './LimitPage.module.css';

const REF = 'limit-wall';

const UNLIMITED_BENEFITS = [
  'Unlimited flashcards',
  'Run multiple conversions at once',
  'PDFs and large Notion exports',
  'Cancel anytime',
];

const AUTO_SYNC_BENEFITS = [
  'Everything in Unlimited',
  'Notion edits sync to Anki every 5 minutes',
  'No exports, no manual steps',
  'Cancel anytime',
];

function AnonymousLimit() {
  useEffect(() => {
    track('paywall_shown', { surface: REF, variant: 'anonymous' });
  }, []);

  return (
    <div className={styles.page}>
      <Helmet>
        <title>Sign up free to keep converting | 2anki</title>
      </Helmet>

      <header className={styles.header}>
        <h1 className={styles.heading}>Sign up free to keep converting</h1>
        <p className={styles.subheading}>
          A free account converts up to 100 cards a month. Without an account,
          conversions are capped at 21 cards.
        </p>
      </header>

      <div className={styles.singlePlan}>
        <div className={`${styles.planCard} ${styles.planCardFeatured}`}>
          <p className={styles.planTitle}>Free account</p>
          <ul className={styles.planBenefits}>
            <li className={styles.planBenefit}>Up to 100 cards a month</li>
            <li className={styles.planBenefit}>Save and re-download your decks</li>
            <li className={styles.planBenefit}>Connect Notion, Dropbox, and Google Drive</li>
          </ul>
          <Link
            to="/register?redirect=/upload"
            className={styles.planCtaPrimary}
            onClick={() =>
              track('paywall_upgrade_clicked', {
                surface: REF,
                plan: 'free_signup',
              })
            }
          >
            Sign up free
          </Link>
        </div>
      </div>

      <p className={styles.backLink}>
        Already have an account? <Link to="/login?redirect=/upload">Sign in</Link>
      </p>
    </div>
  );
}

export function LimitPage() {
  const [searchParams] = useSearchParams();
  const { data: userLocals } = useUserLocals();
  const email = userLocals?.user?.email;
  const isLoggedIn = userLocals?.user?.id != null;
  const [autoSyncPending, setAutoSyncPending] = useState(false);
  const [autoSyncError, setAutoSyncError] = useState<string | null>(null);
  const [dayPassPending, setDayPassPending] = useState(false);
  const [weekPassPending, setWeekPassPending] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);

  const kind = searchParams.get('kind');
  const showAnonymous = kind === 'anonymous' || !isLoggedIn;

  useEffect(() => {
    if (showAnonymous) return;
    track('paywall_shown', { surface: REF });
  }, [showAnonymous]);

  if (showAnonymous) {
    return <AnonymousLimit />;
  }

  const handleAutoSyncClick = async () => {
    if (!isLoggedIn) {
      globalThis.location.href = `/login?redirect=/limit&ref=${REF}`;
      return;
    }
    track('paywall_upgrade_clicked', { surface: REF, plan: 'auto_sync' });
    setAutoSyncPending(true);
    setAutoSyncError(null);
    try {
      const result = await get2ankiApi().startAutoSyncCheckout();
      if ('url' in result) {
        globalThis.location.href = result.url;
        return;
      }
      if (result.status === 'already_subscribed') {
        globalThis.location.href = '/ankify/setup';
        return;
      }
      setAutoSyncError("Couldn't start checkout. Try again or email support@2anki.net.");
    } finally {
      setAutoSyncPending(false);
    }
  };

  const handlePassCheckout = async (passKind: '24h' | '7d') => {
    if (!isLoggedIn) {
      globalThis.location.href = `/login?redirect=/limit&ref=${REF}`;
      return;
    }
    track('paywall_upgrade_clicked', {
      surface: REF,
      plan: passKind === '24h' ? 'day_pass' : 'week_pass',
    });
    setPassError(null);
    if (passKind === '24h') {
      setDayPassPending(true);
    } else {
      setWeekPassPending(true);
    }
    try {
      const result = await get2ankiApi().startPassCheckout(passKind);
      if ('url' in result) {
        globalThis.location.href = result.url;
        return;
      }
      setPassError("Couldn't start checkout. Try again or email support@2anki.net.");
    } finally {
      setDayPassPending(false);
      setWeekPassPending(false);
    }
  };

  const unlimitedLink = isLoggedIn
    ? `${getSubscribeLink(email)}&ref=${REF}`
    : `/login?redirect=/pricing&ref=${REF}`;

  return (
    <div className={styles.page}>
      <Helmet>
        <title>You reached your monthly limit | 2anki</title>
      </Helmet>

      <header className={styles.header}>
        <h1 className={styles.heading}>You reached 100 cards this month</h1>
        <p className={styles.subheading}>
          Upgrade to keep converting — no cap, no wait.
        </p>
      </header>

      <div className={styles.plans}>
        <div className={styles.planCard}>
          <p className={styles.planBadge}>Most popular</p>
          <p className={styles.planTitle}>Unlimited</p>
          <p className={styles.planPrice}>
            {MONTHLY_PRICE}
            <span className={styles.planPriceSuffix}>{MONTHLY_SUFFIX}</span>
          </p>
          <ul className={styles.planBenefits}>
            {UNLIMITED_BENEFITS.map((b) => (
              <li key={b} className={styles.planBenefit}>
                {b}
              </li>
            ))}
          </ul>
          <a
            href={unlimitedLink}
            className={styles.planCtaSecondary}
            onClick={() =>
              track('paywall_upgrade_clicked', {
                surface: REF,
                plan: 'unlimited',
              })
            }
          >
            Upgrade to Unlimited
          </a>
        </div>

        <div className={`${styles.planCard} ${styles.planCardFeatured}`}>
          <p className={styles.planBadge}>Never re-upload again</p>
          <p className={styles.planTitle}>Auto Sync</p>
          <p className={styles.planPrice}>
            {AUTO_SYNC_PRICE}
            <span className={styles.planPriceSuffix}>{MONTHLY_SUFFIX}</span>
          </p>
          <ul className={styles.planBenefits}>
            {AUTO_SYNC_BENEFITS.map((b) => (
              <li key={b} className={styles.planBenefit}>
                {b}
              </li>
            ))}
          </ul>
          <button
            type="button"
            className={styles.planCtaPrimary}
            onClick={handleAutoSyncClick}
            disabled={autoSyncPending}
          >
            {autoSyncPending ? 'Starting checkout…' : 'Get Auto Sync'}
          </button>
          {autoSyncError && (
            <p className={styles.planError} role="alert">
              {autoSyncError}
            </p>
          )}
        </div>
      </div>

      <p className={styles.sectionLabel}>Pay once — no subscription</p>
      <PassCards
        onDayPass={() => handlePassCheckout('24h')}
        onWeekPass={() => handlePassCheckout('7d')}
        dayPassPending={dayPassPending}
        weekPassPending={weekPassPending}
      />
      {passError && (
        <p className={styles.planError} role="alert">
          {passError}
        </p>
      )}

      <p className={styles.backLink}>
        <Link to="/upload">Back to upload</Link>
      </p>
    </div>
  );
}

export default LimitPage;
