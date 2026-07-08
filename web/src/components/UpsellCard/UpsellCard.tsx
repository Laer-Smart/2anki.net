import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { track } from '../../lib/analytics/track';
import { get2ankiApi } from '../../lib/backend/get2ankiApi';
import { useCardUsage } from '../../lib/hooks/useCardUsage';
import { useUserLocals } from '../../lib/hooks/useUserLocals';
import { isPayingUser } from '../NavigationBar/helpers/getPlanLabel';
import { PASS_PRICES } from '../../pages/PricingPage/payment.links';
import styles from './UpsellCard.module.css';

type Surface = 'downloads_upsell' | 'upload_success_upsell';

interface UpsellCardProps {
  readonly surface: Surface;
  readonly hideForAnonymous?: boolean;
}

const HEADLINE: Record<Surface, string> = {
  downloads_upsell: 'Converting more this month?',
  upload_success_upsell: 'More pages to convert?',
};

const BODY: Record<Surface, string> = {
  downloads_upsell:
    'A Day Pass lifts the 100-card limit for 24 hours — no subscription.',
  upload_success_upsell:
    'A pass lifts the 100-card monthly cap — for a day or a week, no subscription.',
};

export function UpsellCard({
  surface,
  hideForAnonymous = false,
}: UpsellCardProps) {
  const { data } = useUserLocals();
  const [pendingKind, setPendingKind] = useState<'24h' | '7d' | null>(null);
  const upgradeClickedRef = useRef(false);
  const shownFiredRef = useRef(false);

  const paying = isPayingUser(data?.locals);
  const isAnonymous = data?.user?.email == null;
  const suppress = paying || (hideForAnonymous && isAnonymous);

  const cardUsage = useCardUsage(!suppress);
  const quotaRemaining =
    cardUsage != null && !cardUsage.loading
      ? cardUsage.cards_limit - cardUsage.cards_used
      : null;

  useEffect(() => {
    if (suppress) return;
    if (shownFiredRef.current) return;
    if (cardUsage?.loading) return;
    shownFiredRef.current = true;
    const props =
      quotaRemaining == null
        ? { surface }
        : { surface, quota_remaining: quotaRemaining };
    track('paywall_shown', props);
  }, [suppress, surface, quotaRemaining, cardUsage]);

  useEffect(() => {
    if (suppress) return;
    return () => {
      if (upgradeClickedRef.current) return;
      track('paywall_dismissed', { surface });
    };
  }, [suppress, surface]);

  useEffect(() => {
    const resetOnRestore = (event: PageTransitionEvent) => {
      if (event.persisted) {
        setPendingKind(null);
      }
    };
    globalThis.addEventListener('pageshow', resetOnRestore);
    return () => globalThis.removeEventListener('pageshow', resetOnRestore);
  }, []);

  if (suppress) return null;

  const handlePassClick = async (kind: '24h' | '7d') => {
    upgradeClickedRef.current = true;
    track('paywall_upgrade_clicked', {
      surface,
      plan: kind === '24h' ? 'day_pass' : 'week_pass',
    });
    setPendingKind(kind);
    const result = await get2ankiApi().startPassCheckout(
      kind,
      undefined,
      surface
    );
    if ('url' in result) {
      globalThis.location.href = result.url;
      return;
    }
    setPendingKind(null);
  };

  const handleSeePlansClick = () => {
    upgradeClickedRef.current = true;
    track('paywall_upgrade_clicked', { surface, plan: 'see_plans' });
  };

  return (
    <section
      className={styles.card}
      aria-label="Keep going without the monthly cap"
    >
      <p className={styles.headline}>{HEADLINE[surface]}</p>
      <p className={styles.body}>{BODY[surface]}</p>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primary}
          onClick={() => handlePassClick('24h')}
          disabled={pendingKind != null}
        >
          {pendingKind === '24h'
            ? 'Starting checkout'
            : `Get Day Pass — ${PASS_PRICES['24h']}`}
        </button>
        <Link
          className={styles.secondary}
          to="/pricing"
          onClick={handleSeePlansClick}
        >
          See plans
        </Link>
      </div>
    </section>
  );
}
