import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  TooltipContentProps,
  XAxis,
  YAxis,
} from 'recharts';

import { ActiveSubsTimeseriesPoint } from '../businessTypes';
import { formatDailyLabel } from '../businessHelpers';
import {
  AXIS_STROKE,
  AXIS_TICK_STYLE,
  GRID_STROKE,
  SERIES_BLUE,
  TIME_SERIES_CHART_MARGIN,
  TOOLTIP_CURSOR_FILL,
} from './timeSeriesChartHelpers';
import TimeSeriesTooltipShell, {
  TimeSeriesTooltipRow,
} from './TimeSeriesTooltipShell';

interface ActiveSubsTimeseriesChartProps {
  points: ActiveSubsTimeseriesPoint[];
}

interface ActiveSubsRow {
  t: string;
  label: string;
  active_paying_subs: number;
}

const buildRows = (points: ActiveSubsTimeseriesPoint[]): ActiveSubsRow[] =>
  points.map((point) => ({
    t: point.t,
    label: formatDailyLabel(point.t),
    active_paying_subs: point.active_paying_subs,
  }));

function ActiveSubsTooltip({ active, payload }: TooltipContentProps) {
  if (!active || payload == null || payload.length === 0) return null;
  const row = payload[0].payload as ActiveSubsRow;
  return (
    <TimeSeriesTooltipShell title={row.label}>
      <TimeSeriesTooltipRow
        label="active"
        value={row.active_paying_subs.toLocaleString()}
      />
    </TimeSeriesTooltipShell>
  );
}

export default function ActiveSubsTimeseriesChart({
  points,
}: Readonly<ActiveSubsTimeseriesChartProps>) {
  const data = buildRows(points);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={TIME_SERIES_CHART_MARGIN}>
        <CartesianGrid stroke={GRID_STROKE} vertical={false} />
        <XAxis
          dataKey="label"
          tick={AXIS_TICK_STYLE}
          stroke={AXIS_STROKE}
          minTickGap={32}
        />
        <YAxis
          tick={AXIS_TICK_STYLE}
          stroke={AXIS_STROKE}
          allowDecimals={false}
        />
        <Tooltip content={ActiveSubsTooltip} cursor={TOOLTIP_CURSOR_FILL} />
        <Line
          type="monotone"
          dataKey="active_paying_subs"
          stroke={SERIES_BLUE}
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
