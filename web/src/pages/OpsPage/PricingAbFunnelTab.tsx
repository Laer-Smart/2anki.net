import sharedStyles from '../../styles/shared.module.css';
import styles from './OpsPage.module.css';
import { FUNNEL_WINDOWS, usePricingAbFunnel } from './usePricingAbFunnel';

function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

function fmtPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

function fmtRevenue(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function PricingAbFunnelTab() {
  const { data, loading, error, window, setWindow, refresh } =
    usePricingAbFunnel();

  return (
    <>
      <p className={styles.panelTitle}>Pricing A/B funnel</p>
      <p className={styles.panelSubtitle}>
        Per-variant breakdown since PR #2828 (2026-05-26). Variants are sticky
        in localStorage: unlimited-first, passes-first, minimal.
      </p>

      <div className={styles.tabHeader}>
        <div className={styles.controls}>
          <label htmlFor="funnel-window" className={styles.controlsLabel}>
            Window
          </label>
          <select
            id="funnel-window"
            className={`${sharedStyles.select} ${styles.windowSelect}`}
            value={window}
            onChange={(e) =>
              setWindow(e.target.value as (typeof FUNNEL_WINDOWS)[number])
            }
          >
            {FUNNEL_WINDOWS.map((w) => (
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
            {loading ? 'Loading' : 'Refresh'}
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

      {data?.variants != null && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Variant funnel</h2>
          </div>
          <div className={sharedStyles.surface}>
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Variant</th>
                    <th className={styles.numeric}>Users shown</th>
                    <th className={styles.numeric}>Upgrade clicks</th>
                    <th className={styles.numeric}>Click rate</th>
                    <th className={styles.numeric}>Paid conversions</th>
                    <th className={styles.numeric}>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {data.variants.map((row) => (
                    <tr key={row.variant}>
                      <td>
                        <code>{row.variant}</code>
                      </td>
                      <td className={styles.numeric}>{fmt(row.users_shown)}</td>
                      <td className={styles.numeric}>
                        {fmt(row.upgrade_clicks)}
                      </td>
                      <td className={styles.numeric}>
                        {fmtPct(row.upgrade_click_rate_pct)}
                      </td>
                      <td className={styles.numeric}>
                        {fmt(row.paid_conversions)}
                      </td>
                      <td className={styles.numeric}>
                        {fmtRevenue(row.revenue_cents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {data?.surface_breakdown != null && data.surface_breakdown.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Surface breakdown</h2>
            <p className={styles.sectionHint}>
              upload_success_upsell and downloads_upsell carry no variant —
              expected
            </p>
          </div>
          <div className={sharedStyles.surface}>
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Surface</th>
                    <th className={styles.numeric}>Distinct users</th>
                  </tr>
                </thead>
                <tbody>
                  {data.surface_breakdown.map((row) => (
                    <tr key={row.surface}>
                      <td>
                        <code>{row.surface}</code>
                      </td>
                      <td className={styles.numeric}>
                        {fmt(row.distinct_users)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {loading && data == null && (
        <p className={styles.emptyHint}>Loading funnel data</p>
      )}
    </>
  );
}
