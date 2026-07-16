import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

import TimeSeriesTooltipShell from '../../OpsPage/charts/TimeSeriesTooltipShell';
import styles from './StudyStatsSection.module.css';
import { AnkifyStatsReviewDay } from './types';
import { buildHeatmapWeeks, HeatmapCell } from './heatmap';

const BUCKET_CLASS = [
  styles.cell0,
  styles.cell1,
  styles.cell2,
  styles.cell3,
  styles.cell4,
];

const MONTH_KEYS = [
  'jan',
  'feb',
  'mar',
  'apr',
  'may',
  'jun',
  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec',
];

const monthName = (t: TFunction, monthIndex: number): string =>
  t(`stats.months.${MONTH_KEYS[monthIndex]}`);

const WEEKDAY_GUTTER = [
  { row: 2, key: 'mon' },
  { row: 4, key: 'wed' },
  { row: 6, key: 'fri' },
];

const formatCellLabel = (cell: HeatmapCell, t: TFunction): string => {
  const [year, month, day] = cell.date.split('-');
  const when = `${Number(day)} ${monthName(t, Number(month) - 1)} ${year}`;
  if (cell.count === 0) {
    return t('stats.noReviewsOn', { when });
  }
  return t('stats.reviewsOn', { count: cell.count, when });
};

interface MonthLabel {
  column: number;
  text: string;
}

const buildMonthLabels = (
  weeks: HeatmapCell[][],
  t: TFunction
): MonthLabel[] => {
  const labels: MonthLabel[] = [];
  let lastMonth = '';
  weeks.forEach((week, index) => {
    const firstOfMonth = week.find((cell) => cell.date.endsWith('-01'));
    if (firstOfMonth == null) {
      return;
    }
    const month = firstOfMonth.date.slice(5, 7);
    if (month !== lastMonth) {
      lastMonth = month;
      labels.push({
        column: index + 1,
        text: monthName(t, Number(month) - 1),
      });
    }
  });
  return labels;
};

interface ReviewStreakHeatmapProps {
  reviewsByDay: AnkifyStatsReviewDay[];
  today: string;
  currentStreak: number;
  reviewsThisYear: number;
}

export default function ReviewStreakHeatmap({
  reviewsByDay,
  today,
  currentStreak,
  reviewsThisYear,
}: Readonly<ReviewStreakHeatmapProps>) {
  const { t } = useTranslation('ankify');
  const [hovered, setHovered] = useState<string | null>(null);
  const weeks = buildHeatmapWeeks(reviewsByDay, today);
  const monthLabels = buildMonthLabels(weeks, t);
  const summary = t('stats.heatmapSummary', {
    streak: currentStreak,
    reviews: reviewsThisYear,
  });

  return (
    <div className={styles.heatmap}>
      <div className={styles.monthRow} aria-hidden="true">
        {monthLabels.map((label) => (
          <span
            key={`${label.text}-${label.column}`}
            className={styles.monthLabel}
            style={{ gridColumnStart: label.column }}
          >
            {label.text}
          </span>
        ))}
      </div>
      <div className={styles.gridArea}>
        <div className={styles.weekdayGutter} aria-hidden="true">
          {WEEKDAY_GUTTER.map((day) => (
            <span
              key={day.key}
              className={styles.weekdayLabel}
              style={{ gridRowStart: day.row }}
            >
              {t(`stats.weekday.${day.key}`)}
            </span>
          ))}
        </div>
        <div className={styles.heatmapGrid} role="img" aria-label={summary}>
          {weeks.map((week) => (
            <div key={week[0].date} className={styles.heatmapColumn}>
              {week.map((cell) => (
                <div
                  key={cell.date}
                  className={`${styles.cell} ${BUCKET_CLASS[cell.bucket]}`}
                  title={formatCellLabel(cell, t)}
                  onMouseEnter={() => setHovered(cell.date)}
                  onMouseLeave={() => setHovered(null)}
                >
                  {hovered === cell.date && (
                    <span className={styles.cellTooltip}>
                      <TimeSeriesTooltipShell title={formatCellLabel(cell, t)}>
                        {null}
                      </TimeSeriesTooltipShell>
                    </span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className={styles.heatmapLegend}>
        <span>{t('stats.less')}</span>
        {[0, 1, 2, 3, 4].map((bucket) => (
          <span
            key={bucket}
            className={`${styles.legendCell} ${BUCKET_CLASS[bucket]}`}
            aria-hidden="true"
          />
        ))}
        <span>{t('stats.more')}</span>
      </div>
    </div>
  );
}
