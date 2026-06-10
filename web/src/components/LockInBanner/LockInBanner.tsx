import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { track } from '../../lib/analytics/track';
import { get2ankiApi } from '../../lib/backend/get2ankiApi';
import styles from './LockInBanner.module.css';

const DISMISS_KEY = 'lockInBannerDismissed';
const DISMISS_VALUE = '2026-06';

interface LockInBannerProps {
  isLoggedIn: boolean;
  isFree: boolean;
}

export function LockInBanner({
  isLoggedIn,
  isFree,
}: Readonly<LockInBannerProps>) {
  const [visible, setVisible] = useState(false);
  const shownFiredRef = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoggedIn || !isFree) return;
    if (localStorage.getItem(DISMISS_KEY) === DISMISS_VALUE) return;

    let cancelled = false;
    get2ankiApi()
      .getCheckoutPrices()
      .then((prices) => {
        if (cancelled || prices == null) return;
        if (prices.legacy && prices.lockInDeadline != null) {
          setVisible(true);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, isFree]);

  useEffect(() => {
    if (!visible || shownFiredRef.current) return;
    shownFiredRef.current = true;
    track('lock_in_banner_shown');
  }, [visible]);

  if (!visible) return null;

  const onSeePlans = () => {
    track('lock_in_banner_clicked');
    navigate('/pricing');
  };

  const onDismiss = () => {
    localStorage.setItem(DISMISS_KEY, DISMISS_VALUE);
    setVisible(false);
  };

  return (
    <output className={styles.banner}>
      <span className={styles.message}>
        Prices go up for new members on Monday. Lock in $6/month by Sunday 21
        June.
      </span>
      <button type="button" className={styles.cta} onClick={onSeePlans}>
        See plans
      </button>
      <button
        type="button"
        className={styles.dismiss}
        aria-label="Dismiss"
        onClick={onDismiss}
      >
        ×
      </button>
    </output>
  );
}
