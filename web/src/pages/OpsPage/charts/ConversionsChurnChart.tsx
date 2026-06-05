import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  TooltipContentProps,
  XAxis,
  YAxis,
} from 'recharts';

import { ConversionsChurnWeekPoint } from '../businessTypes';
import { formatWeekLabel } from '../businessHelpers';
import {
  AXIS_STROKE,
  AXIS_TICK_STYLE,
  GRID_STROKE,
  SERIES_GREEN,
  SERIES_RED,
  TIME_SERIES_CHART_MARGIN,
  TOOLTIP_CURSOR_FILL,
} from './timeSeriesChartHelpers';
import TimeSeriesTooltipShell, {
  TimeSeriesTooltipRow,
} from './TimeSeriesTooltipShell';

interface ConversionsChurnChartProps {
  points: ConversionsChurnWeekPoint[];
}

interface WeekRow {
  week: string;
  label: string;
  new_paying: number;
  churned: number;
}

const buildRows = (points: ConversionsChurnWeekPoint[]): WeekRow[] =>
  points.map((point) => ({
    week: point.week,
    label: formatWeekLabel(point.week),
    new_paying: point.new_paying,
    churned: point.churned,
  }));

function ConversionsChurnTooltip({ active, payload }: TooltipContentProps) {
  if (!active || payload == null || payload.length === 0) return null;
  const row = payload[0].payload as WeekRow;
  return (
    <TimeSeriesTooltipShell title={row.label}>
      <TimeSeriesTooltipRow
        label="new"
        value={row.new_paying.toLocaleString()}
      />
      <TimeSeriesTooltipRow
        label="churned"
        value={row.churned.toLocaleString()}
      />
    </TimeSeriesTooltipShell>
  );
}

export default function ConversionsChurnChart({
  points,
}: Readonly<ConversionsChurnChartProps>) {
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
        <Tooltip
          content={ConversionsChurnTooltip}
          cursor={TOOLTIP_CURSOR_FILL}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="new_paying" fill={SERIES_GREEN} name="new" />
        <Bar dataKey="churned" fill={SERIES_RED} name="churned" />
      </BarChart>
    </ResponsiveContainer>
  );
}
