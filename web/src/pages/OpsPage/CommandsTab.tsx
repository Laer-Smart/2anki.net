import { useState } from 'react';

import sharedStyles from '../../styles/shared.module.css';
import styles from './OpsPage.module.css';
import { syncStripeSubscriptions } from './syncStripeSubscriptions';

type Status = 'idle' | 'loading' | 'success' | 'error';

async function callInactivityWarnings(
  dryRun: boolean
): Promise<{ count: number; dryRun: boolean }> {
  const response = await fetch(
    `/api/ops/send-inactivity-warnings?dryRun=${dryRun}`,
    { method: 'POST', credentials: 'include' }
  );
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(
      data.message ?? `${response.status} ${response.statusText}`
    );
  }
  return response.json();
}

export default function CommandsTab() {
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const [syncStatus, setSyncStatus] = useState<Status>('idle');
  const [syncMessage, setSyncMessage] = useState('');

  const run = async (dryRun: boolean) => {
    setStatus('loading');
    setMessage('');
    try {
      const result = await callInactivityWarnings(dryRun);
      const label = result.dryRun
        ? `${result.count} account${result.count === 1 ? '' : 's'} would receive a warning email.`
        : `Warning email sent to ${result.count} account${result.count === 1 ? '' : 's'}.`;
      setStatus('success');
      setMessage(label);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const runStripeSync = async () => {
    setSyncStatus('loading');
    setSyncMessage('');
    try {
      const result = await syncStripeSubscriptions();
      setSyncStatus('success');
      setSyncMessage(result.message);
    } catch (error) {
      setSyncStatus('error');
      setSyncMessage(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  return (
    <>
      <p className={styles.panelTitle}>Commands</p>
      <p className={styles.panelSubtitle}>
        Manual ops actions. Run dry-run first to validate counts before sending.
      </p>

      <section className={`${sharedStyles.surface} ${styles.card}`}>
        <h2 className={styles.cardTitle}>Inactivity warnings</h2>
        <p className={styles.panelSubtitle}>
          Finds free accounts inactive for 6+ months (excludes lifetime and
          active subscribers) and sends a deletion warning email. Capped at 500
          per run.
        </p>
        <div className={styles.controls}>
          <button
            type="button"
            className={sharedStyles.btnSmall}
            onClick={() => run(true)}
            disabled={status === 'loading'}
          >
            {status === 'loading' ? 'Working…' : 'Dry run'}
          </button>
          <button
            type="button"
            className={sharedStyles.btnSmall}
            onClick={() => run(false)}
            disabled={status === 'loading'}
          >
            Send warnings
          </button>
        </div>
      </section>

      {status === 'success' && message && (
        <div className={`${sharedStyles.alertSuccess} ${styles.banner}`}>
          {message}
        </div>
      )}
      {status === 'error' && message && (
        <div className={`${sharedStyles.alertDanger} ${styles.banner}`}>
          {message}
        </div>
      )}

      <section className={`${sharedStyles.surface} ${styles.card}`}>
        <h2 className={styles.cardTitle}>Stripe subscriptions</h2>
        <p className={styles.panelSubtitle}>
          Pulls active Stripe subscriptions into the database and reconciles
          each active row against Stripe. Use this to provision a paying user
          whose subscription did not land via webhook. Runs in the background —
          check the server logs for the result.
        </p>
        <div className={styles.controls}>
          <button
            type="button"
            className={sharedStyles.btnSmall}
            onClick={runStripeSync}
            disabled={syncStatus === 'loading'}
          >
            {syncStatus === 'loading' ? 'Starting…' : 'Sync now'}
          </button>
        </div>
      </section>

      {syncStatus === 'success' && syncMessage && (
        <div className={`${sharedStyles.alertSuccess} ${styles.banner}`}>
          {syncMessage}
        </div>
      )}
      {syncStatus === 'error' && syncMessage && (
        <div className={`${sharedStyles.alertDanger} ${styles.banner}`}>
          {syncMessage}
        </div>
      )}
    </>
  );
}
