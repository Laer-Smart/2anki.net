import { useEffect } from 'react';

import JobResponse from '../../../schemas/public/JobResponse';
import { getDistance } from '../../../lib/getDistance';
import { firePaywallEvent } from '../../../lib/analytics/firePaywallEvent';
import { track } from '../../../lib/analytics/track';
import {
  MONTHLY_PRICE,
  MONTHLY_SUFFIX,
} from '../../PricingPage/pricing.constants';
import styles from './PaywallBanner.module.css';

interface PaywallBannerProps {
  readonly inProgressJob: JobResponse | null;
}

const UPGRADE_HREF = '/pricing?source=paywall-cancel';

export function PaywallBanner({ inProgressJob }: PaywallBannerProps) {
  useEffect(() => {
    firePaywallEvent('paywall_shown');
    track('paywall_shown', { surface: 'downloads_banner' });
  }, []);

  const handleCtaClick = () => {
    firePaywallEvent('paywall_clicked_upgrade');
    track('paywall_upgrade_clicked', { surface: 'downloads_banner' });
  };

  const startedDistance =
    inProgressJob?.created_at == null
      ? null
      : getDistance(inProgressJob.created_at);
  const hasTitle =
    inProgressJob?.title != null && inProgressJob.title.trim().length > 0;

  return (
    <section className={styles.banner} aria-label="Upgrade to Unlimited">
      <h2 className={styles.headline}>
        One conversion at a time on the free plan
      </h2>
      <p className={styles.body}>
        This conversion was paused so the one you already started can finish.
        Upgrade to Unlimited to run several at once.
      </p>
      <div className={styles.actions}>
        <a
          className={styles.cta}
          href={UPGRADE_HREF}
          onClick={handleCtaClick}
        >
          Upgrade to Unlimited — {MONTHLY_PRICE} {MONTHLY_SUFFIX}
        </a>
        {inProgressJob != null && startedDistance != null && hasTitle && (
          <span className={styles.secondary}>
            {'Or wait for "'}
            <span
              className={styles.jobTitle}
              title={inProgressJob.title ?? undefined}
              data-hj-suppress
            >
              {inProgressJob.title}
            </span>
            {'" to finish — started '}
            {startedDistance}
            {' ago.'}
          </span>
        )}
        {inProgressJob != null && startedDistance != null && !hasTitle && (
          <span className={styles.secondary}>
            Or wait for your current conversion to finish — started{' '}
            {startedDistance} ago.
          </span>
        )}
      </div>
    </section>
  );
}
