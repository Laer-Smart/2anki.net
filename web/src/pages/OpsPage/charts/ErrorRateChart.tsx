import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  TooltipContentProps,
  XAxis,
  YAxis,
} from 'recharts';

import styles from '../OpsPage.module.css';
import {
  errorRateColor,
  errorRatePercent,
  formatPercent,
  truncateRoute,
} from '../opsHelpers';
import {
  OpsMetricsRouteErrorPoint,
  OpsMetricsServiceErrorPoint,
} from '../opsTypes';

interface ErrorRateChartProps {
  routes: OpsMetricsRouteErrorPoint[];
  services: OpsMetricsServiceErrorPoint[];
}

interface ErrorBarRow {
  key: string;
  fullLabel: string;
  shortLabel: string;
  percent: number;
  errors: number;
  total: number;
}

const TICK_VALUES = [0, 5, 25, 100];
const tickFormatter = (value: number) => `${value}%`;

function ErrorTooltip({ active, payload }: TooltipContentProps) {
  if (!active || payload == null || payload.length === 0) return null;
  const row = payload[0].payload as ErrorBarRow;
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipTitle}>{row.fullLabel}</div>
      <div className={styles.tooltipRow}>
        <span>error rate</span>
        <span className={styles.tooltipNumber}>
          {formatPercent(row.percent)}
        </span>
      </div>
      <div className={styles.tooltipRow}>
        <span>errors</span>
        <span className={styles.tooltipNumber}>
          {row.errors.toLocaleString()} / {row.total.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

interface InnerErrorChartProps {
  rows: ErrorBarRow[];
  emptyText: string;
}

function InnerErrorChart({ rows, emptyText }: Readonly<InnerErrorChartProps>) {
  if (rows.length === 0) {
    return <div className={styles.chartEmpty}>{emptyText}</div>;
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={rows}
        layout="vertical"
        margin={{ top: 4, right: 12, left: 4, bottom: 0 }}
      >
        <XAxis
          type="number"
          domain={[0, 100]}
          ticks={TICK_VALUES}
          tickFormatter={tickFormatter}
          tick={{ fontSize: 11, fill: '#6b7280' }}
          stroke="#e5e7eb"
        />
        <YAxis
          type="category"
          dataKey="shortLabel"
          width={150}
          tick={{
            fontSize: 11,
            fill: '#374151',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          }}
          stroke="#e5e7eb"
          interval={0}
        />
        <Tooltip
          content={(props) => <ErrorTooltip {...props} />}
          cursor={{ fill: '#f9fafb' }}
        />
        <Bar dataKey="percent" barSize={10}>
          {rows.map((row) => (
            <Cell key={row.key} fill={errorRateColor(row.percent)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

const buildRouteRows = (routes: OpsMetricsRouteErrorPoint[]): ErrorBarRow[] =>
  routes.map((route) => {
    const fullLabel = `${route.method} ${route.route}`;
    return {
      key: fullLabel,
      fullLabel,
      shortLabel: truncateRoute(fullLabel, 28),
      percent: errorRatePercent(route.errors, route.total),
      errors: route.errors,
      total: route.total,
    };
  });

const buildServiceRows = (
  services: OpsMetricsServiceErrorPoint[]
): ErrorBarRow[] =>
  services.map((service) => ({
    key: service.service,
    fullLabel: service.service,
    shortLabel: truncateRoute(service.service, 18),
    percent: errorRatePercent(service.errors, service.total),
    errors: service.errors,
    total: service.total,
  }));

export default function ErrorRateChart({
  routes,
  services,
}: Readonly<ErrorRateChartProps>) {
  const routeRows = buildRouteRows(routes);
  const serviceRows = buildServiceRows(services);

  return (
    <div className={styles.errorRateRow}>
      <div className={styles.errorRateColumn}>
        <p className={styles.errorRateColumnHeader}>routes</p>
        <div className={styles.errorRateChart}>
          <InnerErrorChart
            rows={routeRows}
            emptyText="No errors in this window."
          />
        </div>
      </div>
      <div className={styles.errorRateDivider} aria-hidden="true" />
      <div className={styles.errorRateColumn}>
        <p className={styles.errorRateColumnHeader}>services</p>
        <div className={styles.errorRateChart}>
          <InnerErrorChart
            rows={serviceRows}
            emptyText="No errors in this window."
          />
        </div>
      </div>
    </div>
  );
}
