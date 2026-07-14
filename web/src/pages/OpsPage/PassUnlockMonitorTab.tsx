import { useState } from 'react';

import sharedStyles from '../../styles/shared.module.css';
import styles from './OpsPage.module.css';
import {
  getPassUnlockMonitor,
  PassUnlockMonitorResponse,
  PassUnlockWindow,
  PASS_UNLOCK_WINDOWS,
} from './passUnlockMonitor';

type Status = 'idle' | 'loading' | 'success' | 'error';

function summarize(data: PassUnlockMonitorResponse): string {
  return `${data.checked} completed pass payment${
    data.checked === 1 ? '' : 's'
  } checked — ${data.granted} unlocked, ${data.missing} missing, ${
    data.pending
  } pending within the ${data.grace_minutes}-minute grace window.`;
}

function renderMissing(data: PassUnlockMonitorResponse) {
  if (data.missingPayments.length === 0) {
    return null;
  }
  return (
    <div className={styles.tableScroll}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Session</th>
            <th>Payment intent</th>
            <th>Kind</th>
            <th>Type</th>
            <th>Paid at</th>
          </tr>
        </thead>
        <tbody>
          {data.missingPayments.map((payment) => (
            <tr key={payment.sessionId}>
              <td>{payment.sessionId}</td>
              <td>{payment.paymentIntentId ?? '—'}</td>
              <td>{payment.kind}</td>
              <td>{payment.anonymous ? 'Anonymous' : 'Account'}</td>
              <td>{new Date(payment.createdAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PassUnlockMonitorTab() {
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const [window, setWindow] = useState<PassUnlockWindow>('7d');
  const [data, setData] = useState<PassUnlockMonitorResponse | null>(null);

  const run = async () => {
    setStatus('loading');
    setMessage('');
    try {
      const result = await getPassUnlockMonitor(window);
      setData(result);
      if (result.error != null) {
        setStatus('error');
        setMessage(result.error);
        return;
      }
      setStatus(result.missing > 0 ? 'error' : 'success');
      setMessage(summarize(result));
    } catch (error) {
      setData(null);
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  return (
    <section className={`${sharedStyles.surface} ${styles.card}`}>
      <h2 className={styles.cardTitle}>Pass unlock monitor</h2>
      <p className={styles.panelSubtitle}>
        Reconciles completed Day and Week pass payments in Stripe against the
        pass rows they should have granted. A missing row is a buyer who paid
        and never got unlocked — reconcile it with the Stripe subscriptions Sync
        or a manual grant. Payments inside the grace window are still in flight,
        not failures.
      </p>
      <div className={styles.controls}>
        <label htmlFor="pass-unlock-window" className={styles.controlsLabel}>
          Window
        </label>
        <select
          id="pass-unlock-window"
          className={`${sharedStyles.select} ${styles.windowSelect}`}
          value={window}
          onChange={(e) => setWindow(e.target.value as PassUnlockWindow)}
        >
          {PASS_UNLOCK_WINDOWS.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>
        <button
          type="button"
          className={sharedStyles.btnSmall}
          onClick={run}
          disabled={status === 'loading'}
        >
          {status === 'loading' ? 'Checking…' : 'Check passes'}
        </button>
      </div>

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

      {data != null && renderMissing(data)}
    </section>
  );
}
