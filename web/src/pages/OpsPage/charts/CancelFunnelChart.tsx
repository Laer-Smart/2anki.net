import { CancelFunnelResponse } from '../cancelFunnelTypes';
import styles from '../OpsPage.module.css';

interface CancelFunnelChartProps {
  data: CancelFunnelResponse | null;
}

const STAGE_LABELS: ReadonlyArray<{
  key: keyof NonNullable<CancelFunnelResponse['stages']>;
  label: string;
}> = [
  { key: 'cancel_started', label: 'cancel started' },
  { key: 'pause_offered', label: 'pause offered' },
  { key: 'paused', label: 'paused' },
  { key: 'cancelled', label: 'cancelled' },
  { key: 'pause_offer_declined', label: 'pause offer declined' },
];

const roundPct = (value: number): number => Math.round(value * 10) / 10;

export default function CancelFunnelChart({
  data,
}: Readonly<CancelFunnelChartProps>) {
  if (data == null || data.stages == null) {
    return (
      <div className={styles.chartEmpty}>No cancellations recorded yet.</div>
    );
  }

  const { stages } = data;

  return (
    <div>
      <p className={styles.cancelFunnelHeadline}>
        <span className={styles.cancelFunnelHeadlineRest}>saved</span>{' '}
        <span className={styles.cancelFunnelHeadlineNum}>{stages.paused}</span>{' '}
        <span className={styles.cancelFunnelHeadlineRest}>
          of {stages.pause_offered} offered — {roundPct(data.save_rate_pct)}%
        </span>
      </p>
      <p className={styles.cancelFunnelReach}>
        {roundPct(data.offer_reach_pct)}% of cancels saw the pause offer
      </p>
      <ul className={styles.cancelStageList}>
        {STAGE_LABELS.map(({ key, label }) => (
          <li key={key} className={styles.cancelStageRow}>
            <span className={styles.cancelStageLabel}>{label}</span>
            <span className={styles.cancelStageValue}>{stages[key]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
