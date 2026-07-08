import { useEffect, useRef } from 'react';

import { track } from '../../lib/analytics/track';
import { useUserLocals } from '../../lib/hooks/useUserLocals';
import { getSubscribeLink } from '../../pages/PricingPage/payment.links';
import styles from './PassLadderCard.module.css';

const SURFACE = 'pass_ladder_success';

interface PassLadderCardProps {
  readonly offerOverride?: { passCount: number; spentUsd: number };
  readonly emailOverride?: string;
}

export function PassLadderCard({
  offerOverride,
  emailOverride,
}: PassLadderCardProps = {}) {
  const { data } = useUserLocals();
  const shownFiredRef = useRef(false);
  const offer = offerOverride ?? data?.passLadder;

  useEffect(() => {
    if (offer == null) return;
    if (shownFiredRef.current) return;
    shownFiredRef.current = true;
    track('paywall_shown', {
      surface: SURFACE,
      passes: offer.passCount,
      spent_usd: offer.spentUsd,
    });
  }, [offer]);

  if (offer == null) return null;

  const handleUnlimitedClick = () => {
    track('paywall_upgrade_clicked', { surface: SURFACE, plan: 'unlimited' });
  };

  return (
    <section
      className={styles.card}
      aria-label="Unlimited costs less than your passes"
    >
      <p className={styles.headline}>
        Spending more on passes than Unlimited costs?
      </p>
      <p className={styles.body}>
        You&apos;ve bought {offer.passCount} passes — ${offer.spentUsd}.
        Unlimited is $7.99 a month — no 100-card cap, cancel anytime.
      </p>
      <a
        className={styles.cta}
        href={getSubscribeLink(emailOverride ?? data?.user?.email)}
        onClick={handleUnlimitedClick}
      >
        Get Unlimited — $7.99/mo
      </a>
    </section>
  );
}
