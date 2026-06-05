import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  TooltipContentProps,
  XAxis,
  YAxis,
} from 'recharts';

import styles from '../OpsPage.module.css';
import {
  collectOutboundServices,
  formatBucketLabel,
  groupOutboundByBucket,
  OutboundBucketRow,
} from '../opsHelpers';
import {
  OpsMetricsOutboundPoint,
  OpsMetricsWindow,
  SERVICE_COLORS,
} from '../opsTypes';

interface OutboundByServiceChartProps {
  points: OpsMetricsOutboundPoint[];
  window: OpsMetricsWindow;
}

const colorFor = (service: string): string =>
  SERVICE_COLORS[service] ?? '#6b7280';

function ServiceTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || payload == null || payload.length === 0) return null;
  const row = payload[0].payload as OutboundBucketRow;
  const services = Object.keys(row).filter(
    (key) => key !== 'bucket' && key !== 'label'
  );
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipTitle}>{String(label)}</div>
      {services.map((service) => (
        <div key={service} className={styles.tooltipRow}>
          <span>{service}</span>
          <span className={styles.tooltipNumber}>
            {Number(row[service] ?? 0).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function OutboundByServiceChart({
  points,
  window,
}: Readonly<OutboundByServiceChartProps>) {
  const services = collectOutboundServices(points);
  const data = groupOutboundByBucket(points).map((row) => ({
    ...row,
    label: formatBucketLabel(row.bucket, window),
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
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
            value: 'calls',
            angle: -90,
            position: 'insideLeft',
            offset: 10,
            style: { fontSize: 11, fill: '#6b7280' },
          }}
        />
        <Tooltip
          content={(props) => <ServiceTooltip {...props} />}
          cursor={{ stroke: '#e5e7eb' }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} iconType="line" />
        {services.map((service) => (
          <Line
            key={service}
            type="monotone"
            dataKey={service}
            stroke={colorFor(service)}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
