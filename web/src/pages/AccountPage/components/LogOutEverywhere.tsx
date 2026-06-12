import { useState } from 'react';
import { get2ankiApi } from '../../../lib/backend/get2ankiApi';
import styles from '../AccountPage.module.css';

export function LogOutEverywhere() {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isWorking, setIsWorking] = useState(false);

  const revokeAll = async () => {
    setIsWorking(true);
    await get2ankiApi().logoutEverywhere();
  };

  return (
    <section className={styles.section}>
      <h4 className={styles.sessionsTitle}>Sessions</h4>
      <div className={styles.sessionsNotice}>
        Lost a device? Log out everywhere to end every session, including this
        one. Sign back in to continue.
      </div>
      {isConfirming ? (
        <div className={styles.buttonRow}>
          <button
            type="button"
            className={styles.sessionsButton}
            onClick={revokeAll}
            disabled={isWorking}
          >
            Confirm
          </button>
          <button
            type="button"
            className={styles.sessionsButtonGhost}
            onClick={() => setIsConfirming(false)}
            disabled={isWorking}
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          className={styles.sessionsButton}
          onClick={() => setIsConfirming(true)}
        >
          Log out everywhere
        </button>
      )}
    </section>
  );
}
