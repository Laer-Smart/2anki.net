import type { AnswerFigureKind } from './answersConfig';
import styles from './AnswerFigures.module.css';

interface FigureProps {
  readonly kind: AnswerFigureKind;
  readonly caption: string;
}

export function AnswerFigure({ kind, caption }: FigureProps) {
  return (
    <figure className={styles.figure}>
      {kind === 'forgetting-curve' && <ForgettingCurve />}
      {kind === 'retention-workload' && <RetentionWorkload />}
      <figcaption className={styles.caption}>{caption}</figcaption>
    </figure>
  );
}

function ForgettingCurve() {
  // Exponential decay R(t) = exp(-t/S), with S chosen so R(7d) = 0.90.
  // Drawing space: x in [40, 380] = 340px wide, y in [20, 200] = 180px tall.
  // x maps days 0..200, y maps probability 1..0.
  const xAt = (day: number): number => 40 + (day / 200) * 340;
  const yAt = (p: number): number => 20 + (1 - p) * 180;

  const points: string[] = [];
  for (let day = 0; day <= 200; day += 2) {
    const p = Math.exp(-day / 66.4);
    points.push(`${xAt(day).toFixed(1)},${yAt(p).toFixed(1)}`);
  }
  const curve = `M ${points.join(' L ')}`;

  const reviewX = xAt(7);
  const reviewY = yAt(0.9);
  const ninetyLineY = yAt(0.9);

  return (
    <svg
      viewBox="0 0 420 240"
      role="img"
      aria-labelledby="forgetting-curve-title forgetting-curve-desc"
      className={styles.svg}
    >
      <title id="forgetting-curve-title">
        Forgetting curve with 90% retention marker
      </title>
      <desc id="forgetting-curve-desc">
        A curve showing recall probability decaying over time. A dashed
        horizontal line at 0.90 marks the default FSRS retention target; the
        curve crosses it after about a week, which is where the next review
        would be scheduled.
      </desc>

      {/* Axes */}
      <line x1="40" y1="200" x2="380" y2="200" className={styles.axis} />
      <line x1="40" y1="20" x2="40" y2="200" className={styles.axis} />

      {/* 90% retention line */}
      <line
        x1="40"
        y1={ninetyLineY}
        x2="380"
        y2={ninetyLineY}
        className={styles.gridLine}
      />
      <text x="385" y={ninetyLineY + 4} className={styles.tickLabel}>
        0.90
      </text>

      {/* Forgetting curve */}
      <path d={curve} className={styles.curve} />

      {/* Marker at the crossover */}
      <line
        x1={reviewX}
        y1={reviewY}
        x2={reviewX}
        y2="200"
        className={styles.markerLine}
      />
      <circle cx={reviewX} cy={reviewY} r="4" className={styles.markerDot} />
      <text x={reviewX + 8} y={reviewY - 6} className={styles.markerLabel}>
        Next review
      </text>

      {/* Axis labels */}
      <text x="40" y="220" className={styles.axisLabel}>
        0 days
      </text>
      <text x="200" y="220" className={styles.axisLabel} textAnchor="middle">
        Time since last review
      </text>
      <text x="380" y="220" className={styles.axisLabel} textAnchor="end">
        200 days
      </text>
      <text
        x="14"
        y="110"
        className={styles.axisLabel}
        transform="rotate(-90 14 110)"
        textAnchor="middle"
      >
        Recall probability
      </text>
      <text x="34" y="24" className={styles.tickLabel} textAnchor="end">
        1.0
      </text>
      <text x="34" y="204" className={styles.tickLabel} textAnchor="end">
        0
      </text>
    </svg>
  );
}

function RetentionWorkload() {
  // Workload(r) approximated as 1 / (1 - r) normalised to 1.0 at r=0.90.
  // Domain r in [0.70, 0.98]. Y axis is "relative reviews per day", normalised
  // so r=0.90 → 1.0. Capped at 6× for display.
  const xAt = (r: number): number => 40 + ((r - 0.7) / 0.28) * 340;
  // For y: anchor 6× workload at the top, 0 at the bottom.
  const yAt = (w: number): number => 200 - (Math.min(w, 6) / 6) * 180;
  const workload = (r: number): number => 0.1 / (1 - r);

  const points: string[] = [];
  for (let r = 0.7; r <= 0.985; r += 0.005) {
    points.push(`${xAt(r).toFixed(1)},${yAt(workload(r)).toFixed(1)}`);
  }
  const curve = `M ${points.join(' L ')}`;

  const markers: { r: number; label: string }[] = [
    { r: 0.85, label: '0.85 — lighter' },
    { r: 0.9, label: '0.90 — default' },
    { r: 0.95, label: '0.95 — heavier' },
  ];

  return (
    <svg
      viewBox="0 0 420 240"
      role="img"
      aria-labelledby="retention-workload-title retention-workload-desc"
      className={styles.svg}
    >
      <title id="retention-workload-title">
        Desired retention vs daily review workload
      </title>
      <desc id="retention-workload-desc">
        A curve showing how relative reviews per day grow as desired retention
        approaches 1.0. Markers at 0.85, 0.90 (default), and 0.95 show that
        raising retention from 0.90 to 0.95 roughly doubles the review load,
        while dropping to 0.85 lightens it.
      </desc>

      {/* Axes */}
      <line x1="40" y1="200" x2="380" y2="200" className={styles.axis} />
      <line x1="40" y1="20" x2="40" y2="200" className={styles.axis} />

      {/* 1× workload reference */}
      <line
        x1="40"
        y1={yAt(1)}
        x2="380"
        y2={yAt(1)}
        className={styles.gridLine}
      />
      <text x="385" y={yAt(1) + 4} className={styles.tickLabel}>
        1×
      </text>

      {/* Workload curve */}
      <path d={curve} className={styles.curve} />

      {/* Retention markers */}
      {markers.map(({ r, label }) => {
        const cx = xAt(r);
        const cy = yAt(workload(r));
        const textY = cy < 60 ? cy + 20 : cy - 10;
        return (
          <g key={r}>
            <line
              x1={cx}
              y1={cy}
              x2={cx}
              y2="200"
              className={styles.markerLine}
            />
            <circle cx={cx} cy={cy} r="4" className={styles.markerDot} />
            <text x={cx + 8} y={textY} className={styles.markerLabel}>
              {label}
            </text>
          </g>
        );
      })}

      {/* Axis labels */}
      <text x="40" y="220" className={styles.axisLabel}>
        0.70
      </text>
      <text x="200" y="220" className={styles.axisLabel} textAnchor="middle">
        Desired retention
      </text>
      <text x="380" y="220" className={styles.axisLabel} textAnchor="end">
        0.98
      </text>
      <text
        x="14"
        y="110"
        className={styles.axisLabel}
        transform="rotate(-90 14 110)"
        textAnchor="middle"
      >
        Relative reviews per day
      </text>
    </svg>
  );
}
