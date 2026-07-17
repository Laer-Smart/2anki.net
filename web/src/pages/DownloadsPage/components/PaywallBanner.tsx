import { useEffect, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('downloadsx');
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
    <section className={styles.banner} aria-label={t('paywall.ariaLabel')}>
      <h2 className={styles.headline}>{t('paywall.headline')}</h2>
      <p className={styles.body}>{t('paywall.body')}</p>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.cta}
          onClick={handleUpgrade}
          disabled={pending}
        >
          {pending ? t('paywall.opening') : t('paywall.upgrade')}
        </button>
        {inProgressJob != null && startedDistance != null && hasTitle && (
          <span className={styles.secondary}>
            <Trans
              t={t}
              i18nKey="paywall.orWaitTitled"
              values={{ title: inProgressJob.title, time: startedDistance }}
              components={{
                jobTitle: (
                  <span
                    className={styles.jobTitle}
                    title={inProgressJob.title ?? undefined}
                    data-hj-suppress
                  />
                ),
              }}
            />
          </span>
        )}
        {inProgressJob != null && startedDistance != null && !hasTitle && (
          <span className={styles.secondary}>
            {t('paywall.orWaitUntitled', { time: startedDistance })}
          </span>
        )}
        <Link className={styles.seeAllPlans} to={SEE_ALL_PLANS_HREF}>
          {t('paywall.seeAllPlans')}
        </Link>
      </div>
    </section>
  );
}
