import { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSearchParams } from 'react-router-dom';
import TopMessage from '../../components/TopMessage/TopMessage';
import { firePaywallEvent } from '../../lib/analytics/firePaywallEvent';
import { track } from '../../lib/analytics/track';
import { get2ankiApi } from '../../lib/backend/get2ankiApi';
import { useCardUsage } from '../../lib/hooks/useCardUsage';
import { usePricingOrderVariant } from '../../lib/hooks/usePricingOrderVariant';
import { getVisibleText } from '../../lib/text/getVisibleText';
import { AutoSyncCard } from './components/AutoSyncCard';
import { ComparisonTable } from './components/ComparisonTable';
import { FeatureGrid } from './components/FeatureGrid';
import { PassCards } from './components/PassCards';
import { PricingCard } from './components/PricingCard';
import { PricingFaq } from './components/PricingFaq';
import { UnlimitedCard } from './components/UnlimitedCard';
import styles from './PricingPage.module.css';
import { getLifetimeLink } from './payment.links';
import { PRICING_FAQ } from './pricingFaq';
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
  const enteredAtRef = useRef(Date.now());
  const shownFiredRef = useRef(false);
  const cardUsage = useCardUsage(true);
  const pricingOrder = usePricingOrderVariant();
  const quotaRemaining =
    cardUsage != null && !cardUsage.loading
      ? cardUsage.cards_limit - cardUsage.cards_used
      : null;

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
    if (shownFiredRef.current) return;
    if (cardUsage?.loading) return;
    shownFiredRef.current = true;
    const props =
      quotaRemaining == null
        ? { surface: 'pricing_page' as const, variant: pricingOrder }
        : {
            surface: 'pricing_page' as const,
            quota_remaining: quotaRemaining,
            variant: pricingOrder,
          };
    track('paywall_shown', props);
  }, [cardUsage, quotaRemaining, pricingOrder]);

  useEffect(() => {
    const enteredAt = enteredAtRef.current;
    const leftFiredRef = { current: false };

    const fireLeft = () => {
      if (leftFiredRef.current) return;
      leftFiredRef.current = true;
      const seconds_on_page = Math.round((Date.now() - enteredAt) / 1000);
      track('pricing_left', { seconds_on_page });
    };

    globalThis.addEventListener('pagehide', fireLeft);
    return () => {
      globalThis.removeEventListener('pagehide', fireLeft);
      fireLeft();
    };
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
    track('paywall_upgrade_clicked', { surface: 'pricing_page', plan: 'auto_sync', variant: pricingOrder });
    setSubscribeError(null);
    const result = await get2ankiApi().startAutoSyncCheckout(pricingOrder);
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
      variant: pricingOrder,
    });
    if (kind === '24h') {
      setDayPassState('pending');
    } else {
      setWeekPassState('pending');
    }
    const result = await get2ankiApi().startPassCheckout(kind, pricingOrder);
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
    track('paywall_upgrade_clicked', { surface: 'pricing_page', plan: 'unlimited', variant: pricingOrder });
    setUnlimitedPending(true);
    const result = await get2ankiApi().startUnlimitedCheckout(billingCycle, pricingOrder);
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
    mainEntity: PRICING_FAQ.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  });

  const unlimitedFirst = pricingOrder === 'unlimited-first';
  const minimalHeader = pricingOrder === 'minimal';

  const passCards = (
    <PassCards
      onDayPass={() => handlePassCheckout('24h')}
      onWeekPass={() => handlePassCheckout('7d')}
      dayPassPending={dayPassState === 'pending'}
      weekPassPending={weekPassState === 'pending'}
      featureDayPass={!unlimitedFirst}
    />
  );

  const monthlyPlans = (
    <div className={styles.anchorGrid}>
      <UnlimitedCard
        isLoggedIn={isLoggedIn}
        billingCycle={billingCycle}
        onBillingCycleChange={setBillingCycle}
        yearlyAvailable={unlimitedYearlyAvailable}
        onUpgrade={handleUnlimitedUpgrade}
        pending={unlimitedPending}
        featured={unlimitedFirst}
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
  );

  const passesSection = (
    <>
      <p className={styles.sectionLabel}>Pay once — no subscription</p>
      {passCards}
    </>
  );

  const monthlySection = (
    <>
      <p className={styles.sectionLabel}>Monthly plans</p>
      {monthlyPlans}
    </>
  );

  return (
    <div className={styles.page}>
      <Helmet>
        <script type="application/ld+json">{pricingFaqJsonLd}</script>
      </Helmet>
      <div className={styles.header}>
        {!minimalHeader && (
          <p className={styles.kicker}>
            <span className={styles.kickerDot} aria-hidden="true" />
            <span>Plans</span>
          </p>
        )}
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
        {!minimalHeader && (
          <p className={styles.intro}>
            {isUS
              ? 'Built for spaced repetition — MCAT, USMLE, bar exam, and language prep. Turn Notion pages, PDFs, and photos into Anki decks with AI — no account needed to start.'
              : 'Turn Notion pages, PDFs, and photos into Anki decks with AI — no account needed to start. Free for 100 cards per month, then pay once by the day or week.'}
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
        )}
        {!minimalHeader && (
          <p className={styles.socialProof}>Trusted by 19,000+ learners worldwide</p>
        )}
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

      {unlimitedFirst ? (
        <>
          {monthlySection}
          {passesSection}
        </>
      ) : (
        <>
          {passesSection}
          {monthlySection}
        </>
      )}

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
          linkText="Request Lifetime"
          variant="outline"
          caption="Reply within 24 hours."
        />
      </div>

      <p className={styles.pricesNote}>
        Prices in USD. Your card is charged in your local currency at checkout.
      </p>

      <ul className={styles.reassurance}>
        <li>Cancel anytime — one click</li>
        <li>Your decks are yours — native .apkg, works in any Anki client</li>
      </ul>

      <FeatureGrid />

      <ComparisonTable />

      <PricingFaq />

      <p className={styles.philosophy}>
        Free works forever. Paid plans support 2anki.net.
      </p>
    </div>
  );
}
