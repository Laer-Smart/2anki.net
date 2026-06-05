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

import { FailedPaymentsWeekPoint } from '../businessTypes';
import { formatWeekLabel } from '../businessHelpers';
import {
  AXIS_STROKE,
  AXIS_TICK_STYLE,
  GRID_STROKE,
  SERIES_RED,
  TIME_SERIES_CHART_MARGIN,
  TOOLTIP_CURSOR_FILL,
} from './timeSeriesChartHelpers';
import TimeSeriesTooltipShell, {
  TimeSeriesTooltipRow,
} from './TimeSeriesTooltipShell';

interface FailedPaymentsWeeklyChartProps {
  points: FailedPaymentsWeekPoint[];
}

interface WeekRow {
  week: string;
  label: string;
  count: number;
}

const buildRows = (points: FailedPaymentsWeekPoint[]): WeekRow[] =>
  points.map((point) => ({
    week: point.week,
    label: formatWeekLabel(point.week),
    count: point.count,
  }));

function FailedPaymentsTooltip({ active, payload }: TooltipContentProps) {
  if (!active || payload == null || payload.length === 0) return null;
  const row = payload[0].payload as WeekRow;
  return (
    <TimeSeriesTooltipShell title={row.label}>
      <TimeSeriesTooltipRow label="failed" value={row.count.toLocaleString()} />
    </TimeSeriesTooltipShell>
  );
}

export default function FailedPaymentsWeeklyChart({
  points,
}: Readonly<FailedPaymentsWeeklyChartProps>) {
  const data = buildRows(points);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={TIME_SERIES_CHART_MARGIN}>
        <CartesianGrid stroke={GRID_STROKE} vertical={false} />
        <XAxis dataKey="label" tick={AXIS_TICK_STYLE} stroke={AXIS_STROKE} />
        <YAxis
          tick={AXIS_TICK_STYLE}
          stroke={AXIS_STROKE}
          allowDecimals={false}
        />
        <Tooltip content={FailedPaymentsTooltip} cursor={TOOLTIP_CURSOR_FILL} />
        <Bar dataKey="count" fill={SERIES_RED} />
      </BarChart>
    </ResponsiveContainer>
  );
}
