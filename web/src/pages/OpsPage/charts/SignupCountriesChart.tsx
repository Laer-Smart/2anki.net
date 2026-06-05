import { SignupCountryPoint } from '../businessTypes';
import { formatCount } from '../opsHelpers';
import styles from '../OpsPage.module.css';

interface SignupCountriesChartProps {
  points: SignupCountryPoint[];
  othersCount?: number;
}

const COUNTRY_BAR_COLOR = '#3b82f6';

export default function SignupCountriesChart({
  points,
  othersCount = 0,
}: Readonly<SignupCountriesChartProps>) {
  const max = Math.max(1, ...points.map((row) => row.count), othersCount);

  return (
    <ul className={styles.statusList} aria-label="Signup country breakdown">
      {points.map((row) => {
        const pct = (row.count / max) * 100;
        return (
          <li key={row.country} className={styles.statusRow}>
            <span className={styles.statusLabel}>{row.country}</span>
            <span className={styles.statusBarWrap}>
              <span
                className={styles.statusBar}
                style={{
                  width: `${pct}%`,
                  backgroundColor: COUNTRY_BAR_COLOR,
                }}
              />
            </span>
            <span className={styles.numeric}>{formatCount(row.count)}</span>
          </li>
        );
      })}
      {othersCount > 0 && (
        <li className={styles.statusRow}>
          <span className={`${styles.statusLabel} ${styles.numericMuted}`}>
            +{othersCount} others
          </span>
          <span className={styles.statusBarWrap} />
          <span className={styles.numericMuted}>—</span>
        </li>
      )}
    </ul>
  );
}
