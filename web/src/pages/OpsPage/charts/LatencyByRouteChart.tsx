import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  TooltipContentProps,
  XAxis,
  YAxis,
} from 'recharts';

import styles from '../OpsPage.module.css';
import { truncateRoute } from '../opsHelpers';
import { OpsMetricsRouteLatencyPoint } from '../opsTypes';

interface LatencyByRouteChartProps {
  points: OpsMetricsRouteLatencyPoint[];
}

interface RouteLatencyRow {
  key: string;
  fullLabel: string;
  shortLabel: string;
  avg_ms: number;
  p95_ms: number;
  count: number;
}

const buildRows = (points: OpsMetricsRouteLatencyPoint[]): RouteLatencyRow[] =>
  points.map((point) => {
    const fullLabel = `${point.method} ${point.route}`;
    return {
      key: fullLabel,
      fullLabel,
      shortLabel: truncateRoute(fullLabel, 32),
      avg_ms: Math.round(point.avg_ms),
      p95_ms: Math.round(point.p95_ms),
      count: point.count,
    };
  });

function LatencyTooltip({ active, payload }: TooltipContentProps) {
  if (!active || payload == null || payload.length === 0) return null;
  const row = payload[0].payload as RouteLatencyRow;
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipTitle}>{row.fullLabel}</div>
      <div className={styles.tooltipRow}>
        <span>avg</span>
        <span className={styles.tooltipNumber}>{row.avg_ms} ms</span>
      </div>
      <div className={styles.tooltipRow}>
        <span>p95</span>
        <span className={styles.tooltipNumber}>{row.p95_ms} ms</span>
      </div>
      <div className={styles.tooltipRow}>
        <span>count</span>
        <span className={styles.tooltipNumber}>
          {row.count.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

export default function LatencyByRouteChart({
  points,
}: Readonly<LatencyByRouteChartProps>) {
  const data = buildRows(points);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
        barCategoryGap={6}
      >
        <CartesianGrid stroke="#f3f4f6" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: '#6b7280' }}
          stroke="#e5e7eb"
          label={{
            value: 'ms',
            position: 'insideBottomRight',
            offset: -4,
            style: { fontSize: 11, fill: '#6b7280' },
          }}
        />
        <YAxis
          type="category"
          dataKey="shortLabel"
          width={220}
          tick={{
            fontSize: 11,
            fill: '#374151',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          }}
          stroke="#e5e7eb"
          interval={0}
        />
        <Tooltip
          content={(props) => <LatencyTooltip {...props} />}
          cursor={{ fill: '#f9fafb' }}
        />
        <Bar dataKey="avg_ms" fill="#3b82f6" barSize={8} />
        <Bar dataKey="p95_ms" fill="#1e40af" barSize={8} />
      </BarChart>
    </ResponsiveContainer>
  );
}
