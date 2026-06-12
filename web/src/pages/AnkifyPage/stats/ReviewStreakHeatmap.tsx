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

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const formatCellTitle = (cell: HeatmapCell): string => {
  const [year, month, day] = cell.date.split('-');
  const label = `${Number(day)} ${MONTHS[Number(month) - 1]} ${year}`;
  const unit = cell.count === 1 ? 'review' : 'reviews';
  return `${cell.count} ${unit} on ${label}`;
};

interface ReviewStreakHeatmapProps {
  reviewsByDay: AnkifyStatsReviewDay[];
  today: string;
}

export default function ReviewStreakHeatmap({
  reviewsByDay,
  today,
}: Readonly<ReviewStreakHeatmapProps>) {
  const weeks = buildHeatmapWeeks(reviewsByDay, today);
  return (
    <div className={styles.heatmapGrid} role="img" aria-label="Review activity">
      {weeks.map((week) => (
        <div key={week[0].date} className={styles.heatmapColumn}>
          {week.map((cell) => (
            <div
              key={cell.date}
              className={`${styles.cell} ${BUCKET_CLASS[cell.bucket]}`}
              title={formatCellTitle(cell)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
