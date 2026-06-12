import { AnkifyStatsReviewDay } from './types';

export interface HeatmapCell {
  date: string;
  count: number;
  bucket: number;
}

export interface BucketThresholds {
  p25: number;
  p50: number;
  p75: number;
}

const MS_PER_DAY = 86_400_000;
const WEEKS = 53;
const DAYS = WEEKS * 7;

const percentile = (sorted: number[], fraction: number): number => {
  const rank = Math.ceil(fraction * sorted.length);
  const index = Math.min(Math.max(rank - 1, 0), sorted.length - 1);
  return sorted[index];
};

export function computeBucketThresholds(
  reviewsByDay: AnkifyStatsReviewDay[]
): BucketThresholds {
  const studied = reviewsByDay
    .map((entry) => entry.count)
    .filter((count) => count > 0)
    .sort((a, b) => a - b);

  if (studied.length === 0) {
    return { p25: 0, p50: 0, p75: 0 };
  }

  return {
    p25: percentile(studied, 0.25),
    p50: percentile(studied, 0.5),
    p75: percentile(studied, 0.75),
  };
}

export function bucketForCount(
  count: number,
  thresholds: BucketThresholds
): number {
  if (count <= 0) {
    return 0;
  }
  if (count <= thresholds.p25) {
    return 1;
  }
  if (count <= thresholds.p50) {
    return 2;
  }
  if (count <= thresholds.p75) {
    return 3;
  }
  return 4;
}

const dayKey = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

export function buildHeatmapWeeks(
  reviewsByDay: AnkifyStatsReviewDay[],
  today: string
): HeatmapCell[][] {
  const thresholds = computeBucketThresholds(reviewsByDay);
  const counts = new Map<string, number>();
  for (const entry of reviewsByDay) {
    counts.set(entry.date, entry.count);
  }

  const todayMs = Date.parse(`${today}T00:00:00Z`);
  const cells: HeatmapCell[] = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    const date = dayKey(todayMs - i * MS_PER_DAY);
    const count = counts.get(date) ?? 0;
    cells.push({ date, count, bucket: bucketForCount(count, thresholds) });
  }

  const weeks: HeatmapCell[][] = [];
  for (let w = 0; w < WEEKS; w++) {
    weeks.push(cells.slice(w * 7, w * 7 + 7));
  }
  return weeks;
}
