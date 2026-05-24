import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSearchParams } from 'react-router-dom';
import TopMessage from '../../components/TopMessage/TopMessage';
import { firePaywallEvent } from '../../lib/analytics/firePaywallEvent';
import { track } from '../../lib/analytics/track';
import { get2ankiApi } from '../../lib/backend/get2ankiApi';
import { getVisibleText } from '../../lib/text/getVisibleText';
import { AutoSyncCard } from './components/AutoSyncCard';
import { PassCards } from './components/PassCards';
import { PricingCard } from './components/PricingCard';
import { UnlimitedCard } from './components/UnlimitedCard';
import styles from './PricingPage.module.css';
import { getLifetimeLink } from './payment.links';
import {
  AUTO_SYNC_LAUNCH_DATE,
  AUTO_SYNC_NEW_CHIP_DAYS,
} from './pricing.constants';

interface PricingPageProps {
  isLoggedIn: boolean;
  email?: string;
  hostedAnkiRequested?: boolean;
  trialStartedAt?: string | null;
  patreon?: boolean | null;
  signupCountry?: string | null;
  autoSyncCapReached?: boolean;
  autoSyncActive?: boolean;
  unlimitedYearlyAvailable?: boolean;
  onTrialStarted?: () => void;
}

type RequestState = 'idle' | 'pending' | 'sent' | 'error';
type PassState = 'idle' | 'pending' | 'error';

function isAutoSyncNewChipVisible(): boolean {
  const daysSinceLaunch =
    (Date.now() - AUTO_SYNC_LAUNCH_DATE.getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceLaunch < AUTO_SYNC_NEW_CHIP_DAYS;
}

function autoSyncCaption(
  patreon: boolean | null | undefined,
  autoSyncActive: boolean,
  hostedAnkiRequested: boolean
): string | undefined {
  if (patreon === true) {
    return 'Included in your Lifetime plan';
  }
  if (autoSyncActive) {
    return undefined;
  }
  if (hostedAnkiRequested) {
    return 'Waitlist is open — subscribe anytime.';
  }
  return undefined;
}

export default function PricingPage({
  isLoggedIn,
  email: _email,
  hostedAnkiRequested = false,
  trialStartedAt,
  patreon,
  signupCountry,
  autoSyncCapReached = false,
  autoSyncActive = false,
  unlimitedYearlyAvailable = false,
  onTrialStarted,
}: Readonly<PricingPageProps>) {
  const isUS = signupCountry === 'US';
  const lifetimeLink = getLifetimeLink();
  const [waitlistState, setWaitlistState] = useState<RequestState>('idle');
  const [trialState, setTrialState] = useState<RequestState>('idle');
  const [subscribeError, setSubscribeError] = useState<string | null>(null);
  const [dayPassState, setDayPassState] = useState<PassState>('idle');
  const [weekPassState, setWeekPassState] = useState<PassState>('idle');
  const [billingCycle, setBillingCycle] = useState<'month' | 'year'>('month');
  const [unlimitedPending, setUnlimitedPending] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const fromPaywall = searchParams.get('source') === 'paywall-cancel';
  const fromContext = searchParams.get('from');
  const showContextBanner =
    fromContext != null && !isLoggedIn ? false : fromContext != null;
  const isAutoSyncUpsell = searchParams.get('upsell') === 'auto-sync';

  useEffect(() => {
    if (!isAutoSyncUpsell) return;
    const next = new URLSearchParams(searchParams);
    next.delete('upsell');
    setSearchParams(next, { replace: true });
  }, [isAutoSyncUpsell, searchParams, setSearchParams]);

  const isLifetime = patreon === true;
  const showAutoSyncNew = isAutoSyncNewChipVisible();

  const showTrialCta =
    isLoggedIn &&
    patreon !== true &&
    trialStartedAt == null &&
    trialState !== 'sent';

  useEffect(() => {
    track('paywall_shown', { surface: 'pricing_page' });
  }, []);

  useEffect(() => {
    if (fromPaywall) {
      firePaywallEvent('paywall_pricing_viewed');
    }
  }, [fromPaywall]);

  const handleWaitlistRequest = async () => {
    if (!isLoggedIn) {
      globalThis.location.href = '/login?redirect=/pricing';
      return;
    }
    setWaitlistState('pending');
    try {
      await get2ankiApi().requestHostedAnkiAccess();
      setWaitlistState('sent');
    } catch {
      setWaitlistState('error');
    }
  };

  const handleAutoSyncSubscribe = async () => {
    if (!isLoggedIn) {
      globalThis.location.href = '/login?redirect=/pricing';
      return;
    }
    track('paywall_upgrade_clicked', { surface: 'pricing_page', plan: 'auto_sync' });
    setSubscribeError(null);
    const result = await get2ankiApi().startAutoSyncCheckout();
    if ('url' in result) {
      globalThis.location.href = result.url;
      return;
    }
    if (result.status === 'cap_reached') {
      await handleWaitlistRequest();
      return;
    }
    if (result.status === 'already_subscribed') {
      globalThis.location.href = '/ankify/setup';
      return;
    }
    setSubscribeError(
      "Couldn't start checkout. Try again, or email support@2anki.net."
    );
  };

  const handleStartTrial = async () => {
    setTrialState('pending');
    try {
      const result = await get2ankiApi().startTrial();
      if (result.ok) {
        setTrialState('sent');
        onTrialStarted?.();
      } else {
        setTrialState('error');
      }
    } catch {
      setTrialState('error');
    }
  };

  const handlePassCheckout = async (kind: '24h' | '7d') => {
    if (!isLoggedIn) {
      globalThis.location.href = '/login?redirect=/pricing';
      return;
    }
    track('paywall_upgrade_clicked', {
      surface: 'pricing_page',
      plan: kind === '24h' ? 'day_pass' : 'week_pass',
    });
    if (kind === '24h') {
      setDayPassState('pending');
    } else {
      setWeekPassState('pending');
    }
    const result = await get2ankiApi().startPassCheckout(kind);
    if ('url' in result) {
      globalThis.location.href = result.url;
      return;
    }
    if (kind === '24h') {
      setDayPassState('error');
    } else {
      setWeekPassState('error');
    }
  };

  const handleUnlimitedUpgrade = async () => {
    if (!isLoggedIn) {
      globalThis.location.href = '/login?redirect=/pricing';
      return;
    }
    track('paywall_upgrade_clicked', { surface: 'pricing_page', plan: 'unlimited' });
    setUnlimitedPending(true);
    const result = await get2ankiApi().startUnlimitedCheckout(billingCycle);
    if ('url' in result) {
      globalThis.location.href = result.url;
      return;
    }
    setUnlimitedPending(false);
  };

  const autoSyncCaptionText =
    subscribeError ??
    autoSyncCaption(patreon, autoSyncActive, hostedAnkiRequested);

  const showCapReached = autoSyncCapReached && !isLifetime && !autoSyncActive;

  function getWaitlistLabel(): string {
    if (waitlistState === 'pending') {
      return 'Joining…';
    }
    if (waitlistState === 'sent') {
      return 'On the waitlist';
    }
    return 'Join the waitlist';
  }
  const waitlistLabel = getWaitlistLabel();

  const pricingFaqJsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'How many cards can I make for free?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '100 cards per month on the free plan. No account required for one-off conversions — drop a file and download a deck.',
        },
      },
      {
        '@type': 'Question',
        name: 'What is the Unlimited plan?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Unlimited is $6 per month. It removes the 100-card limit, adds PDF support, lets you run multiple conversions at once, and includes unlimited Anki to Notion imports.',
        },
      },
      {
        '@type': 'Question',
        name: 'What is Auto Sync?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Auto Sync is $30 per month. Connect your Notion workspace once and 2anki checks your pages every 5 minutes. Edits in Notion flow into your Anki decks automatically — no exports, no manual steps.',
        },
      },
      {
        '@type': 'Question',
        name: 'Is there a one-time payment option?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes — Lifetime starts at $345, paid once. It includes all Unlimited features plus Auto Sync. Apply on the pricing page; access is granted by review.',
        },
      },
      {
        '@type': 'Question',
        name: 'What is a Day Pass or Week Pass?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Day Pass ($4) gives 24 hours of unlimited access. Week Pass ($9) gives 7 days. Both are one-time payments, no subscription required.',
        },
      },
    ],
  });

  return (
    <div className={styles.page}>
      <Helmet>
        <script type="application/ld+json">{pricingFaqJsonLd}</script>
      </Helmet>
      <div className={styles.header}>
        <p className={styles.kicker}>
          <span className={styles.kickerDot} aria-hidden="true" />
          <span>Plans</span>
        </p>
        <h1 className={styles.title}>{getVisibleText('pricing.page.title')}</h1>
        <TopMessage />
        {showContextBanner && (
          <div className={styles.contextBanner} role="status">
            You're on the free plan — 100 cards per month.
          </div>
        )}
        {isAutoSyncUpsell && (
          <div className={styles.contextBanner} role="status">
            Auto Sync sends any deck straight to your Anki — no downloading, no importing.
          </div>
        )}
        <p className={styles.intro}>
          {isUS
            ? 'Built for spaced repetition — MCAT, USMLE, bar exam, and language prep. 100 cards a month free, plus Anki → Notion imports up to 1,000 notes each.'
            : 'Free for everyone — 100 cards per month, plus Anki → Notion imports up to 1,000 notes each.'}
          {!isLoggedIn && (
            <>
              {' '}
              <a href="/register" className={styles.introLink}>
                Start free{' '}
                <span className={styles.introArrow} aria-hidden="true">
                  →
                </span>
              </a>
            </>
          )}
        </p>
      </div>

      {showTrialCta && (
        <div className={styles.trialCta}>
          <button
            type="button"
            className={styles.trialButton}
            onClick={handleStartTrial}
            disabled={trialState === 'pending'}
          >
            {trialState === 'pending'
              ? 'Starting trial…'
              : 'Try Unlimited free for 1 hour — no card needed'}
          </button>
        </div>
      )}

      <p className={styles.sectionLabel}>Monthly plans</p>
      <div className={styles.anchorGrid}>
        <UnlimitedCard
          isLoggedIn={isLoggedIn}
          billingCycle={billingCycle}
          onBillingCycleChange={setBillingCycle}
          yearlyAvailable={unlimitedYearlyAvailable}
          onUpgrade={handleUnlimitedUpgrade}
          pending={unlimitedPending}
        />

        <AutoSyncCard
          showNewBadge={showAutoSyncNew}
          isLifetime={isLifetime}
          isActive={autoSyncActive}
          capReached={showCapReached}
          caption={autoSyncCaptionText}
          waitlistLabel={waitlistLabel}
          waitlistDisabled={
            waitlistState === 'pending' || waitlistState === 'sent'
          }
          onSubscribe={handleAutoSyncSubscribe}
          onWaitlist={handleWaitlistRequest}
        />
      </div>

      <p className={styles.sectionLabel}>Pay once — no subscription</p>
      <PassCards
        onDayPass={() => handlePassCheckout('24h')}
        onWeekPass={() => handlePassCheckout('7d')}
        dayPassPending={dayPassState === 'pending'}
        weekPassPending={weekPassState === 'pending'}
      />

      <p className={styles.sectionLabel}>One-time payment</p>
      <div className={styles.grid}>
        <PricingCard
          badge="Pay once"
          badgeMuted
          price="From $345"
          title="Lifetime"
          benefits={[
            'All Unlimited features, paid once',
            'Auto Sync included',
            'No future price changes',
          ]}
          link={lifetimeLink}
          linkText="Apply"
          variant="outline"
          caption="Reply within 24 hours."
        />
      </div>

      <p className={styles.pricesNote}>
        Prices in USD. Your card is charged in your local currency at checkout.
      </p>

      <p className={styles.philosophy}>
        Free works forever. Paid plans support 2anki.net.
      </p>
    </div>
  );
}
