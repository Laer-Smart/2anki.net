import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import JobResponse from '../../../schemas/public/JobResponse';
import { getDistance } from '../../../lib/getDistance';
import { firePaywallEvent } from '../../../lib/analytics/firePaywallEvent';
import { track } from '../../../lib/analytics/track';
import { get2ankiApi } from '../../../lib/backend/get2ankiApi';
import styles from './PaywallBanner.module.css';

interface PaywallBannerProps {
  readonly inProgressJob: JobResponse | null;
}

const SEE_ALL_PLANS_HREF = '/pricing?source=paywall-cancel';

export function PaywallBanner({ inProgressJob }: PaywallBannerProps) {
  const [pending, setPending] = useState(false);
  const upgradeClickedRef = useRef(false);

  useEffect(() => {
    firePaywallEvent('paywall_shown');
    track('paywall_shown', { surface: 'downloads_banner' });
  }, []);

  useEffect(() => {
    return () => {
      if (upgradeClickedRef.current) return;
      track('paywall_dismissed', { surface: 'downloads_banner' });
    };
  }, []);

  const handleUpgrade = async () => {
    upgradeClickedRef.current = true;
    firePaywallEvent('paywall_clicked_upgrade');
    track('paywall_upgrade_clicked', { surface: 'downloads_banner' });
    setPending(true);
    const result = await get2ankiApi().startUnlimitedCheckout(
      'year',
      undefined,
      'downloads_banner'
    );
    if ('url' in result) {
      globalThis.location.href = result.url;
      return;
    }
    globalThis.location.href = SEE_ALL_PLANS_HREF;
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
        <button
          type="button"
          className={styles.cta}
          onClick={handleUpgrade}
          disabled={pending}
        >
          {pending ? 'Opening checkout' : 'Upgrade to Unlimited'}
        </button>
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
            {'.'}
          </span>
        )}
        {inProgressJob != null && startedDistance != null && !hasTitle && (
          <span className={styles.secondary}>
            Or wait for your current conversion to finish — started{' '}
            {startedDistance}.
          </span>
        )}
        <Link className={styles.seeAllPlans} to={SEE_ALL_PLANS_HREF}>
          See all plans
        </Link>
      </div>
    </section>
  );
}
