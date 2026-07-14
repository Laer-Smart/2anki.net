import sharedStyles from '../../styles/shared.module.css';
import styles from './OpsPage.module.css';
import { formatCount } from './opsHelpers';
import {
  CUSTOMER_SIGNALS_WINDOWS,
  useCustomerSignals,
} from './useCustomerSignals';
import {
  CustomerSignalBucket,
  CustomerSignalRow,
  CustomerSignalSource,
} from './customerSignalsTypes';

const SOURCE_LABELS: Record<CustomerSignalSource, string> = {
  cancel_reason: 'Cancellation reason',
  cancel_comment: 'Cancellation comment',
  emoji_feedback: 'Deck-ready feedback',
  failed_conversion: 'Failed conversion',
  empty_back: 'Empty-back cards',
};

const BUCKET_LABELS: Record<CustomerSignalBucket, string> = {
  'pain-killer': 'Pain killer',
  'money-multiplier': 'Money multiplier',
  unknown: '—',
};

function renderRows(signals: CustomerSignalRow[]) {
  if (signals.length === 0) {
    return (
      <p className={styles.emptyHint}>No customer signal in this window yet.</p>
    );
  }
  return (
    <div className={styles.tableScroll}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Source</th>
            <th>Signal</th>
            <th>Count</th>
            <th>Bucket</th>
          </tr>
        </thead>
        <tbody>
          {signals.map((signal, index) => (
            <tr key={`${signal.source}-${signal.label}-${index}`}>
              <td>{SOURCE_LABELS[signal.source]}</td>
              <td>
                {signal.label}
                {signal.sampleQuote != null && (
                  <p className={styles.commentBody} data-hj-suppress>
                    {signal.sampleQuote}
                  </p>
                )}
              </td>
              <td className={styles.numeric}>{formatCount(signal.count)}</td>
              <td>{BUCKET_LABELS[signal.bucket]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CustomerSignalsTab() {
  const { data, loading, error, window, setWindow, refresh } =
    useCustomerSignals();

  const signals = data?.signals ?? null;

  return (
    <>
      <p className={styles.panelTitle}>Customer signals</p>
      <p className={styles.panelSubtitle}>
        First-party signal ranked by volume — cancellation reasons and comments,
        deck-ready feedback, failed conversions, and empty-back cards. Counts
        cover the rolling window; empty-back cards are all-time.
      </p>

      <div className={styles.tabHeader}>
        <div className={styles.controls}>
          <label
            htmlFor="customer-signals-window"
            className={styles.controlsLabel}
          >
            Window
          </label>
          <select
            id="customer-signals-window"
            className={`${sharedStyles.select} ${styles.windowSelect}`}
            value={window}
            onChange={(e) =>
              setWindow(
                e.target.value as (typeof CUSTOMER_SIGNALS_WINDOWS)[number]
              )
            }
          >
            {CUSTOMER_SIGNALS_WINDOWS.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={sharedStyles.btnSmall}
            onClick={refresh}
            disabled={loading}
          >
            {loading ? 'Reading' : 'Refresh'}
          </button>
        </div>
        {data != null && (
          <p className={styles.refreshHint}>
            as of {new Date(data.as_of).toLocaleString()}
          </p>
        )}
      </div>

      {error != null && (
        <div className={`${sharedStyles.alertDanger} ${styles.banner}`}>
          {error}
        </div>
      )}

      {data?.error != null && (
        <div className={`${sharedStyles.alertDanger} ${styles.banner}`}>
          {data.error}
        </div>
      )}

      {signals != null && renderRows(signals)}

      {loading && data == null && (
        <p className={styles.emptyHint}>Reading customer signals</p>
      )}
    </>
  );
}
