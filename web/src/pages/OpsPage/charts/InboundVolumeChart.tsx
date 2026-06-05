import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  TooltipContentProps,
  XAxis,
  YAxis,
} from 'recharts';

import styles from '../OpsPage.module.css';
import {
  formatBucketLabel,
  groupInboundByBucket,
  InboundBucketRow,
} from '../opsHelpers';
import {
  OpsMetricsBucketPoint,
  OpsMetricsWindow,
  STATUS_CLASS_COLORS,
  StatusClass,
} from '../opsTypes';

const STATUS_ORDER: StatusClass[] = ['2xx', '3xx', '4xx', '5xx'];

interface InboundVolumeChartProps {
  points: OpsMetricsBucketPoint[];
  window: OpsMetricsWindow;
}

function InboundTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || payload == null || payload.length === 0) return null;
  const row = payload[0].payload as InboundBucketRow;
  const total = STATUS_ORDER.reduce((acc, key) => acc + (row[key] ?? 0), 0);
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipTitle}>{String(label)}</div>
      {STATUS_ORDER.map((key) => (
        <div key={key} className={styles.tooltipRow}>
          <span>{key}</span>
          <span className={styles.tooltipNumber}>
            {(row[key] ?? 0).toLocaleString()}
          </span>
        </div>
      ))}
      <div className={styles.tooltipRow}>
        <span>total</span>
        <span className={styles.tooltipNumber}>{total.toLocaleString()}</span>
      </div>
    </div>
  );
}

export default function InboundVolumeChart({
  points,
  window,
}: Readonly<InboundVolumeChartProps>) {
  const data = groupInboundByBucket(points).map((row) => ({
    ...row,
    label: formatBucketLabel(row.bucket, window),
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#f3f4f6" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: '#6b7280' }}
          stroke="#e5e7eb"
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#6b7280' }}
          stroke="#e5e7eb"
          label={{
            value: 'requests',
            angle: -90,
            position: 'insideLeft',
            offset: 10,
            style: { fontSize: 11, fill: '#6b7280' },
          }}
        />
        <Tooltip
          content={(props) => <InboundTooltip {...props} />}
          cursor={{ fill: '#f9fafb' }}
        />
        {STATUS_ORDER.map((key) => (
          <Area
            key={key}
            type="monotone"
            dataKey={key}
            stackId="1"
            stroke={STATUS_CLASS_COLORS[key]}
            fill={STATUS_CLASS_COLORS[key]}
            fillOpacity={0.7}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
