import sharedStyles from '../../styles/shared.module.css';
import styles from './OpsPage.module.css';
import { formatCount } from './opsHelpers';
import {
  LANDING_PAGE_YIELD_WINDOWS,
  useLandingPageYield,
} from './useLandingPageYield';
import { LandingPageYieldEntry } from './landingPageYieldTypes';

const DIRECT_LABEL = 'Direct / unknown';

function originLabel(origin: string | null): string {
  return origin == null || origin.trim() === '' ? DIRECT_LABEL : origin;
}

function renderRows(pages: LandingPageYieldEntry[]) {
  if (pages.length === 0) {
    return <p className={styles.emptyHint}>No signups in this window yet.</p>;
  }
  return (
    <div className={styles.tableScroll}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Page</th>
            <th>Signups</th>
            <th>Subscriptions</th>
            <th>Passes</th>
            <th>Paid rate</th>
          </tr>
        </thead>
        <tbody>
          {pages.map((page) => (
            <tr key={page.origin ?? DIRECT_LABEL}>
              <td>{originLabel(page.origin)}</td>
              <td className={styles.numeric}>{formatCount(page.signups)}</td>
              <td className={styles.numeric}>
                {formatCount(page.subscription_conversions)}
              </td>
              <td className={styles.numeric}>
                {formatCount(page.pass_conversions)}
              </td>
              <td className={styles.numeric}>
                {page.paid_conversion_rate_pct}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function LandingPageYieldTab() {
  const { data, loading, error, window, setWindow, refresh } =
    useLandingPageYield();

  const pages = data?.pages ?? null;

  return (
    <>
      <p className={styles.panelTitle}>Landing page yield</p>
      <p className={styles.panelSubtitle}>
        Signups and paid conversions per landing page, by where the account
        first arrived.
      </p>

      <div className={styles.tabHeader}>
        <div className={styles.controls}>
          <label
            htmlFor="landing-page-yield-window"
            className={styles.controlsLabel}
          >
            Window
          </label>
          <select
            id="landing-page-yield-window"
            className={`${sharedStyles.select} ${styles.windowSelect}`}
            value={window}
            onChange={(e) =>
              setWindow(
                e.target.value as (typeof LANDING_PAGE_YIELD_WINDOWS)[number]
              )
            }
          >
            {LANDING_PAGE_YIELD_WINDOWS.map((w) => (
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

      {pages != null && renderRows(pages)}

      <p className={styles.panelSubtitle}>
        Paid counts users with an active subscription or a purchased pass.
        Anonymous passes bought without an account can't be traced to a page.
      </p>

      {loading && data == null && (
        <p className={styles.emptyHint}>Reading landing page yield</p>
      )}
    </>
  );
}
