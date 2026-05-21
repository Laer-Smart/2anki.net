import { useEffect, useState } from 'react';

import { track } from '../../lib/analytics/track';
import { get2ankiApi } from '../../lib/backend/get2ankiApi';
import { useUserLocals } from '../../lib/hooks/useUserLocals';
import { isPayingUser } from '../NavigationBar/helpers/getPlanLabel';
import { getSubscribeLink } from '../../pages/PricingPage/payment.links';
import styles from './UpsellCard.module.css';

type Surface =
  | 'downloads_upsell'
  | 'upload_success_upsell'
  | 'upload_idle_upsell';

interface UpsellCardProps {
  readonly surface: Surface;
  readonly hideForAnonymous?: boolean;
}

const HEADLINE: Record<Surface, string> = {
  downloads_upsell: 'More decks to download?',
  upload_success_upsell: 'More pages to convert?',
  upload_idle_upsell: 'Whole stack to convert?',
};

const BODY: Record<Surface, string> = {
  downloads_upsell:
    'A pass lifts the 100-card monthly cap. Day or week, no subscription.',
  upload_success_upsell:
    'A pass lifts the 100-card monthly cap — for a day or a week, no subscription.',
  upload_idle_upsell:
    'A pass lifts the 100-card monthly cap. Day or week, no subscription.',
};

export function UpsellCard({ surface, hideForAnonymous = false }: UpsellCardProps) {
  const { data } = useUserLocals();
  const [pendingKind, setPendingKind] = useState<'24h' | '7d' | null>(null);

  const paying = isPayingUser(data?.locals);
  const isAnonymous = data?.user?.email == null;
  const suppress = paying || (hideForAnonymous && isAnonymous);

  useEffect(() => {
    if (suppress) return;
    track('paywall_shown', { surface });
  }, [suppress, surface]);

  if (suppress) return null;

  const email = data?.user?.email;

  const handlePassClick = async (kind: '24h' | '7d') => {
    track('paywall_upgrade_clicked', {
      surface,
      plan: kind === '24h' ? 'day_pass' : 'week_pass',
    });
    setPendingKind(kind);
    const result = await get2ankiApi().startPassCheckout(kind);
    if ('url' in result) {
      globalThis.location.href = result.url;
      return;
    }
    setPendingKind(null);
  };

  const handleUnlimitedClick = () => {
    track('paywall_upgrade_clicked', { surface, plan: 'unlimited' });
  };

  return (
    <section className={styles.card} aria-label="Keep going without the monthly cap">
      <p className={styles.headline}>{HEADLINE[surface]}</p>
      <p className={styles.body}>{BODY[surface]}</p>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primary}
          onClick={() => handlePassClick('24h')}
          disabled={pendingKind != null}
        >
          {pendingKind === '24h' ? 'Redirecting…' : 'Day Pass'}
        </button>
        <button
          type="button"
          className={styles.secondary}
          onClick={() => handlePassClick('7d')}
          disabled={pendingKind != null}
        >
          {pendingKind === '7d' ? 'Redirecting…' : 'Week Pass'}
        </button>
        <span className={styles.dot} aria-hidden="true">·</span>
        <a
          className={styles.secondary}
          href={getSubscribeLink(email)}
          onClick={handleUnlimitedClick}
        >
          Unlimited
        </a>
      </div>
    </section>
  );
}
