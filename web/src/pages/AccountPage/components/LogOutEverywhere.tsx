import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { get2ankiApi } from '../../../lib/backend/get2ankiApi';
import styles from '../AccountPage.module.css';

export function LogOutEverywhere() {
  const { t } = useTranslation('account');
  const [isConfirming, setIsConfirming] = useState(false);
  const [isWorking, setIsWorking] = useState(false);

  const revokeAll = async () => {
    setIsWorking(true);
    await get2ankiApi().logoutEverywhere();
  };

  return (
    <section className={styles.section}>
      <h4 className={styles.sessionsTitle}>{t('logOutEverywhere.sessions')}</h4>
      <div className={styles.sessionsNotice}>
        {t('logOutEverywhere.notice')}
      </div>
      {isConfirming ? (
        <div className={styles.buttonRow}>
          <button
            type="button"
            className={styles.sessionsButton}
            onClick={revokeAll}
            disabled={isWorking}
          >
            {t('logOutEverywhere.confirm')}
          </button>
          <button
            type="button"
            className={styles.sessionsButtonGhost}
            onClick={() => setIsConfirming(false)}
            disabled={isWorking}
          >
            {t('logOutEverywhere.cancel')}
          </button>
        </div>
      ) : (
        <button
          type="button"
          className={styles.sessionsButton}
          onClick={() => setIsConfirming(true)}
        >
          {t('logOutEverywhere.logOutEverywhere')}
        </button>
      )}
    </section>
  );
}
