import { useEffect, useState } from 'react';
import { get2ankiApi } from '../../../lib/backend/get2ankiApi';
import sharedStyles from '../../../styles/shared.module.css';
import styles from './AutoSyncBanner.module.css';

export function AutoSyncBanner() {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    get2ankiApi()
      .getAutoSyncPitchEligibility()
      .then((result) => {
        setVisible(result.accountBanner);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleDismiss = async () => {
    setVisible(false);
    await get2ankiApi().dismissAutoSyncPitch('account_banner').catch(() => {});
  };

  if (loading || !visible) return null;

  return (
    <div className={styles.banner} role="status">
      <p className={styles.copy}>
        Your decks already sync with us. Want them to sync with Anki too?{' '}
        <a href="/pricing#auto-sync" className={sharedStyles.link}>
          See how Auto Sync works
        </a>
      </p>
      <button
        type="button"
        className={`${sharedStyles.btnGhost} ${styles.dismiss}`}
        onClick={handleDismiss}
      >
        Not now
      </button>
    </div>
  );
}
