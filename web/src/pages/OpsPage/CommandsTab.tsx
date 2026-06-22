import { useState } from 'react';

import sharedStyles from '../../styles/shared.module.css';
import styles from './OpsPage.module.css';
import { syncStripeSubscriptions } from './syncStripeSubscriptions';
import {
  deleteInactiveUsers,
  DeleteInactiveUsersResponse,
} from './deleteInactiveUsers';
import {
  getOrphanedSubscriptions,
  reconcileOrphanedSubscriptions,
  OrphanedSubscriptionsResponse,
  ReconcileOrphanedSubscriptionsResponse,
} from './orphanedSubscriptions';
import {
  archiveLegacyPrices,
  ArchiveLegacyPriceResult,
  ArchiveLegacyPricesResponse,
} from './archiveLegacyPrices';

type Status = 'idle' | 'loading' | 'success' | 'error';

function formatDeleteResult(result: DeleteInactiveUsersResponse): string {
  if (result.dryRun) {
    return `${result.count} account${result.count === 1 ? '' : 's'} would be deleted.`;
  }
  return `Deleted ${result.count} account${result.count === 1 ? '' : 's'}.`;
}

function formatReconcileResult(
  result: ReconcileOrphanedSubscriptionsResponse
): string {
  return `${result.found} found, ${result.emailed} emailed, ${result.skippedRecentlyNotified} skipped (notified in last 14 days), ${result.skippedNoEmail} skipped (no email).`;
}

const ARCHIVE_ACTION_LABELS: Record<
  ArchiveLegacyPriceResult['action'],
  string
> = {
  would_archive: 'would archive',
  archived: 'archived',
  already_archived: 'already archived',
  skipped_missing_env: 'skipped (no price id configured)',
  skipped_guard: 'skipped (v2 price — guarded)',
};

function formatArchivePrice(price: ArchiveLegacyPriceResult): string {
  if (price.priceId === '') {
    return ARCHIVE_ACTION_LABELS[price.action];
  }
  const amount =
    price.unitAmount == null ? '—' : `$${(price.unitAmount / 100).toFixed(2)}`;
  const interval = price.interval == null ? '' : `/${price.interval}`;
  return `${price.priceId} — ${amount}${interval} — ${ARCHIVE_ACTION_LABELS[price.action]}`;
}

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
  const [deleteStatus, setDeleteStatus] = useState<Status>('idle');
  const [deleteMessage, setDeleteMessage] = useState('');
  const [orphanStatus, setOrphanStatus] = useState<Status>('idle');
  const [orphanMessage, setOrphanMessage] = useState('');
  const [orphans, setOrphans] = useState<
    OrphanedSubscriptionsResponse['orphans']
  >([]);
  const [archiveStatus, setArchiveStatus] = useState<Status>('idle');
  const [archiveMessage, setArchiveMessage] = useState('');
  const [archivePrices, setArchivePrices] = useState<
    ArchiveLegacyPricesResponse['prices']
  >([]);

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

  const runDelete = async (dryRun: boolean) => {
    setDeleteStatus('loading');
    setDeleteMessage('');
    try {
      const result = await deleteInactiveUsers(dryRun);
      setDeleteStatus('success');
      setDeleteMessage(formatDeleteResult(result));
    } catch (error) {
      setDeleteStatus('error');
      setDeleteMessage(
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  };

  const runOrphanPreview = async () => {
    setOrphanStatus('loading');
    setOrphanMessage('');
    try {
      const result = await getOrphanedSubscriptions();
      setOrphans(result.orphans);
      setOrphanStatus('success');
      setOrphanMessage(
        `${result.count} orphaned active subscription${
          result.count === 1 ? '' : 's'
        }.`
      );
    } catch (error) {
      setOrphanStatus('error');
      setOrphanMessage(
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  };

  const runOrphanReconcile = async () => {
    setOrphanStatus('loading');
    setOrphanMessage('');
    try {
      const result = await reconcileOrphanedSubscriptions();
      setOrphanStatus('success');
      setOrphanMessage(formatReconcileResult(result));
    } catch (error) {
      setOrphanStatus('error');
      setOrphanMessage(
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  };

  const runArchiveLegacyPrices = async (dryRun: boolean) => {
    setArchiveStatus('loading');
    setArchiveMessage('');
    try {
      const result = await archiveLegacyPrices(dryRun);
      setArchivePrices(result.prices);
      setArchiveStatus('success');
      setArchiveMessage(
        dryRun
          ? `Dry run — ${result.prices.length} legacy price${result.prices.length === 1 ? '' : 's'} checked.`
          : `Done — ${result.prices.length} legacy price${result.prices.length === 1 ? '' : 's'} processed.`
      );
    } catch (error) {
      setArchiveStatus('error');
      setArchiveMessage(
        error instanceof Error ? error.message : 'Unknown error'
      );
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

      <section className={`${sharedStyles.surface} ${styles.card}`}>
        <h2 className={styles.cardTitle}>Delete inactive accounts</h2>
        <p className={styles.panelSubtitle}>
          Permanently deletes free accounts that were warned 14+ days ago and
          have not logged in since, plus inactive free accounts whose email
          address hard-bounced or was dropped — the warning email can never
          reach them. Excludes lifetime and active subscribers. Capped at 100
          per run. Check candidates first — deletion cannot be undone.
        </p>
        <div className={styles.controls}>
          <button
            type="button"
            className={sharedStyles.btnSmall}
            onClick={() => runDelete(true)}
            disabled={deleteStatus === 'loading'}
          >
            {deleteStatus === 'loading' ? 'Working…' : 'Check candidates'}
          </button>
          <button
            type="button"
            className={sharedStyles.btnDanger}
            onClick={() => runDelete(false)}
            disabled={deleteStatus === 'loading'}
          >
            Delete inactive accounts
          </button>
        </div>
      </section>

      {deleteStatus === 'success' && deleteMessage && (
        <div className={`${sharedStyles.alertSuccess} ${styles.banner}`}>
          {deleteMessage}
        </div>
      )}
      {deleteStatus === 'error' && deleteMessage && (
        <div className={`${sharedStyles.alertDanger} ${styles.banner}`}>
          {deleteMessage}
        </div>
      )}

      <section className={`${sharedStyles.surface} ${styles.card}`}>
        <h2 className={styles.cardTitle}>Orphaned subscriptions</h2>
        <p className={styles.panelSubtitle}>
          Finds active subscriptions where the paid email, linked email, and
          Stripe customer id match no account — so the payer is not getting
          premium. Preview first, then email each payer how to connect their
          subscription. Nothing is auto-created or auto-linked. An address
          emailed in the last 14 days is skipped.
        </p>
        <div className={styles.controls}>
          <button
            type="button"
            className={sharedStyles.btnSmall}
            onClick={runOrphanPreview}
            disabled={orphanStatus === 'loading'}
          >
            {orphanStatus === 'loading' ? 'Working…' : 'Preview orphans'}
          </button>
          <button
            type="button"
            className={sharedStyles.btnSmall}
            onClick={runOrphanReconcile}
            disabled={orphanStatus === 'loading'}
          >
            Send recovery emails
          </button>
        </div>
        {orphans.length > 0 && (
          <ul className={styles.panelSubtitle}>
            {orphans.map((orphan) => (
              <li key={orphan.id} style={{ fontWeight: 500 }}>
                <span data-hj-suppress>{orphan.email}</span>
                {orphan.stripeProductId ? ` — ${orphan.stripeProductId}` : ''}
              </li>
            ))}
          </ul>
        )}
      </section>

      {orphanStatus === 'success' && orphanMessage && (
        <div className={`${sharedStyles.alertSuccess} ${styles.banner}`}>
          {orphanMessage}
        </div>
      )}
      {orphanStatus === 'error' && orphanMessage && (
        <div className={`${sharedStyles.alertDanger} ${styles.banner}`}>
          {orphanMessage}
        </div>
      )}

      <section className={`${sharedStyles.surface} ${styles.card}`}>
        <h2 className={styles.cardTitle}>Archive legacy prices</h2>
        <p className={styles.panelSubtitle}>
          Archives the legacy $6/mo and $60/yr Unlimited prices now that the
          lock-in window closed. Existing subscriptions keep renewing on their
          price — new checkouts already resolve the v2 prices. Touches only the
          two configured legacy prices, never deletes, and skips any price that
          resolves to a v2 lookup key. Check status first.
        </p>
        <div className={styles.controls}>
          <button
            type="button"
            className={sharedStyles.btnSmall}
            onClick={() => runArchiveLegacyPrices(true)}
            disabled={archiveStatus === 'loading'}
          >
            {archiveStatus === 'loading' ? 'Working…' : 'Check status'}
          </button>
          <button
            type="button"
            className={sharedStyles.btnDanger}
            onClick={() => runArchiveLegacyPrices(false)}
            disabled={archiveStatus === 'loading'}
          >
            Archive prices
          </button>
        </div>
        {archivePrices.length > 0 && (
          <ul className={styles.panelSubtitle}>
            {archivePrices.map((price, index) => (
              <li
                key={price.priceId === '' ? `missing-${index}` : price.priceId}
                style={{ fontWeight: 500 }}
              >
                {formatArchivePrice(price)}
              </li>
            ))}
          </ul>
        )}
      </section>

      {archiveStatus === 'success' && archiveMessage && (
        <div className={`${sharedStyles.alertSuccess} ${styles.banner}`}>
          {archiveMessage}
        </div>
      )}
      {archiveStatus === 'error' && archiveMessage && (
        <div className={`${sharedStyles.alertDanger} ${styles.banner}`}>
          {archiveMessage}
        </div>
      )}
    </>
  );
}
