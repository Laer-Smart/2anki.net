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

import { EmojiFeedbackRatingPoint } from '../businessTypes';
import TimeSeriesTooltipShell, {
  TimeSeriesTooltipRow,
} from './TimeSeriesTooltipShell';
import {
  AXIS_STROKE,
  AXIS_TICK_STYLE,
  GRID_STROKE,
  SERIES_BLUE,
  TOOLTIP_CURSOR_FILL,
} from './timeSeriesChartHelpers';

const EMOJI_LABELS: Record<number, string> = {
  1: '\u{1F621}',
  2: '\u{1F928}',
  5: '\u{1F60D}',
};

const VISIBLE_RATINGS = [1, 2, 5] as const;

interface ChartRow {
  label: string;
  count: number;
}

const buildRows = (points: EmojiFeedbackRatingPoint[]): ChartRow[] => {
  const map = new Map(points.map((p) => [p.rating, p.count]));
  return VISIBLE_RATINGS.map((r) => ({
    label: EMOJI_LABELS[r] ?? String(r),
    count: map.get(r) ?? 0,
  }));
};

function RatingTooltip({ active, payload }: TooltipContentProps) {
  if (!active || payload == null || payload.length === 0) return null;
  const row = payload[0].payload as ChartRow;
  return (
    <TimeSeriesTooltipShell title={row.label}>
      <TimeSeriesTooltipRow
        label="responses"
        value={row.count.toLocaleString()}
      />
    </TimeSeriesTooltipShell>
  );
}

const MARGIN = { top: 8, right: 16, left: 0, bottom: 0 } as const;

interface EmojiFeedbackChartProps {
  points: EmojiFeedbackRatingPoint[];
}

export default function EmojiFeedbackChart({
  points,
}: Readonly<EmojiFeedbackChartProps>) {
  const data = buildRows(points);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={MARGIN}>
        <CartesianGrid stroke={GRID_STROKE} vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 20 }}
          stroke={AXIS_STROKE}
        />
        <YAxis
          tick={AXIS_TICK_STYLE}
          stroke={AXIS_STROKE}
          allowDecimals={false}
        />
        <Tooltip content={RatingTooltip} cursor={TOOLTIP_CURSOR_FILL} />
        <Bar dataKey="count" fill={SERIES_BLUE} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
