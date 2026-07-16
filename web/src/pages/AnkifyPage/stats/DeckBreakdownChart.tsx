import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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

import TimeSeriesTooltipShell, {
  TimeSeriesTooltipRow,
} from '../../OpsPage/charts/TimeSeriesTooltipShell';
import {
  AXIS_STROKE,
  AXIS_TICK_STYLE,
  GRID_STROKE,
  SERIES_BLUE,
  TOOLTIP_CURSOR_FILL,
} from '../../OpsPage/charts/timeSeriesChartHelpers';
import styles from './StudyStatsSection.module.css';
import { AnkifyStatsDeck } from './types';

const NEW_FILL = '#bfdbfe';
const LEARNING_FILL = '#60a5fa';
const REVIEW_FILL = SERIES_BLUE;

const DEFAULT_VISIBLE = 8;

const HORIZONTAL_MARGIN = {
  top: 8,
  right: 16,
  left: 0,
  bottom: 0,
} as const;

const truncate = (name: string): string =>
  name.length > 40 ? `${name.slice(0, 40)}…` : name;

interface DeckRow {
  fullName: string;
  new: number;
  learning: number;
  review: number;
  total: number;
}

function DeckTooltip({ active, payload }: TooltipContentProps) {
  const { t } = useTranslation('ankify');
  if (!active || payload == null || payload.length === 0) return null;
  const row = payload[0].payload as DeckRow;
  return (
    <TimeSeriesTooltipShell title={row.fullName}>
      <TimeSeriesTooltipRow
        label={t('stats.new')}
        value={row.new.toLocaleString()}
      />
      <TimeSeriesTooltipRow
        label={t('stats.learning')}
        value={row.learning.toLocaleString()}
      />
      <TimeSeriesTooltipRow
        label={t('stats.review')}
        value={row.review.toLocaleString()}
      />
    </TimeSeriesTooltipShell>
  );
}

interface DeckBreakdownChartProps {
  decks: AnkifyStatsDeck[];
}

export default function DeckBreakdownChart({
  decks,
}: Readonly<DeckBreakdownChartProps>) {
  const { t } = useTranslation('ankify');
  const [showAll, setShowAll] = useState(false);

  const rows: DeckRow[] = decks
    .filter((deck) => deck.total > 0)
    .map((deck) => ({
      fullName: deck.fullName,
      new: deck.new,
      learning: deck.learning,
      review: deck.review,
      total: deck.total,
    }));

  if (rows.length === 0) {
    return null;
  }

  const visibleRows = showAll ? rows : rows.slice(0, DEFAULT_VISIBLE);
  const chartHeight = visibleRows.length * 34 + 32;

  return (
    <div className={styles.deckBlock}>
      <p className={styles.deckLabel}>{t('stats.byDeck')}</p>
      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span
            className={styles.legendSwatch}
            style={{ background: NEW_FILL }}
          />
          {t('stats.new')}
        </span>
        <span className={styles.legendItem}>
          <span
            className={styles.legendSwatch}
            style={{ background: LEARNING_FILL }}
          />
          {t('stats.learning')}
        </span>
        <span className={styles.legendItem}>
          <span
            className={styles.legendSwatch}
            style={{ background: REVIEW_FILL }}
          />
          {t('stats.review')}
        </span>
      </div>
      <div style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={visibleRows}
            layout="vertical"
            margin={HORIZONTAL_MARGIN}
          >
            <CartesianGrid stroke={GRID_STROKE} horizontal={false} />
            <XAxis
              type="number"
              tick={AXIS_TICK_STYLE}
              stroke={AXIS_STROKE}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="fullName"
              tick={AXIS_TICK_STYLE}
              stroke={AXIS_STROKE}
              width={160}
              tickFormatter={truncate}
            />
            <Tooltip content={DeckTooltip} cursor={TOOLTIP_CURSOR_FILL} />
            <Bar dataKey="new" stackId="cards" fill={NEW_FILL} />
            <Bar dataKey="learning" stackId="cards" fill={LEARNING_FILL} />
            <Bar dataKey="review" stackId="cards" fill={REVIEW_FILL} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {rows.length > DEFAULT_VISIBLE && !showAll && (
        <button
          type="button"
          className={styles.showAllButton}
          onClick={() => setShowAll(true)}
        >
          {t('stats.showAll')}
        </button>
      )}
    </div>
  );
}
