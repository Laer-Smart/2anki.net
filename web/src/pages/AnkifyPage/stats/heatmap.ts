import { AnkifyStatsReviewDay } from './types';

export interface HeatmapCell {
  date: string;
  count: number;
  bucket: number;
}

const MS_PER_DAY = 86_400_000;
const WEEKS = 53;
const DAYS = WEEKS * 7;

export function reviewBucket(count: number): number {
  if (count <= 0) {
    return 0;
  }
  if (count < 5) {
    return 1;
  }
  if (count < 15) {
    return 2;
  }
  if (count < 30) {
    return 3;
  }
  return 4;
}

const dayKey = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

export function buildHeatmapWeeks(
  reviewsByDay: AnkifyStatsReviewDay[],
  today: string
): HeatmapCell[][] {
  const counts = new Map<string, number>();
  for (const entry of reviewsByDay) {
    counts.set(entry.date, entry.count);
  }

  const todayMs = Date.parse(`${today}T00:00:00Z`);
  const cells: HeatmapCell[] = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    const date = dayKey(todayMs - i * MS_PER_DAY);
    const count = counts.get(date) ?? 0;
    cells.push({ date, count, bucket: reviewBucket(count) });
  }

  const weeks: HeatmapCell[][] = [];
  for (let w = 0; w < WEEKS; w++) {
    weeks.push(cells.slice(w * 7, w * 7 + 7));
  }
  return weeks;
}
