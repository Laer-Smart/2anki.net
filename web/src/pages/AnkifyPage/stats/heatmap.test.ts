import { describe, expect, test } from 'vitest';

import {
  bucketForCount,
  buildHeatmapWeeks,
  computeBucketThresholds,
} from './heatmap';

describe('computeBucketThresholds', () => {
  test('returns zero thresholds when there are no studied days', () => {
    expect(computeBucketThresholds([])).toEqual({ p25: 0, p50: 0, p75: 0 });
  });

  test('ignores zero-count days when computing percentiles', () => {
    const thresholds = computeBucketThresholds([
      { date: '2026-06-01', count: 0 },
      { date: '2026-06-02', count: 10 },
      { date: '2026-06-03', count: 0 },
    ]);
    expect(thresholds).toEqual({ p25: 10, p50: 10, p75: 10 });
  });

  test('computes rising quartile thresholds from the nonzero distribution', () => {
    const days = [4, 8, 12, 16, 20, 24, 28, 32].map((count, index) => ({
      date: `2026-06-0${index + 1}`,
      count,
    }));
    const thresholds = computeBucketThresholds(days);
    expect(thresholds.p25).toBeLessThan(thresholds.p50);
    expect(thresholds.p50).toBeLessThan(thresholds.p75);
  });
});

describe('bucketForCount', () => {
  const thresholds = { p25: 5, p50: 10, p75: 20 };

  test('zero reviews map to bucket 0', () => {
    expect(bucketForCount(0, thresholds)).toBe(0);
  });

  test('counts at or below p25 map to bucket 1', () => {
    expect(bucketForCount(1, thresholds)).toBe(1);
    expect(bucketForCount(5, thresholds)).toBe(1);
  });

  test('counts above p25 and at or below p50 map to bucket 2', () => {
    expect(bucketForCount(6, thresholds)).toBe(2);
    expect(bucketForCount(10, thresholds)).toBe(2);
  });

  test('counts above p50 and at or below p75 map to bucket 3', () => {
    expect(bucketForCount(11, thresholds)).toBe(3);
    expect(bucketForCount(20, thresholds)).toBe(3);
  });

  test('counts above p75 map to bucket 4', () => {
    expect(bucketForCount(21, thresholds)).toBe(4);
    expect(bucketForCount(500, thresholds)).toBe(4);
  });

  test('any nonzero count maps to bucket 4 when the distribution is flat', () => {
    const flat = { p25: 0, p50: 0, p75: 0 };
    expect(bucketForCount(0, flat)).toBe(0);
    expect(bucketForCount(7, flat)).toBe(4);
  });
});

describe('buildHeatmapWeeks', () => {
  test('returns 53 week columns of 7 cells each ending today', () => {
    const weeks = buildHeatmapWeeks([], '2026-06-12');
    expect(weeks).toHaveLength(53);
    for (const week of weeks) {
      expect(week).toHaveLength(7);
    }
  });

  test('places a review count on its matching day cell', () => {
    const weeks = buildHeatmapWeeks(
      [{ date: '2026-06-12', count: 7 }],
      '2026-06-12'
    );
    const allCells = weeks.flat();
    const todayCell = allCells.find((c) => c.date === '2026-06-12');
    expect(todayCell?.count).toBe(7);
    const earlier = allCells.find((c) => c.date === '2026-06-01');
    expect(earlier?.count).toBe(0);
  });

  test('buckets each day relative to the user own distribution', () => {
    const reviewsByDay = [
      { date: '2026-06-06', count: 4 },
      { date: '2026-06-07', count: 8 },
      { date: '2026-06-08', count: 12 },
      { date: '2026-06-09', count: 16 },
      { date: '2026-06-10', count: 20 },
      { date: '2026-06-11', count: 24 },
      { date: '2026-06-12', count: 100 },
    ];
    const weeks = buildHeatmapWeeks(reviewsByDay, '2026-06-12');
    const allCells = weeks.flat();
    const lowest = allCells.find((c) => c.date === '2026-06-06');
    const highest = allCells.find((c) => c.date === '2026-06-12');
    const empty = allCells.find((c) => c.date === '2026-06-05');
    expect(empty?.bucket).toBe(0);
    expect(lowest?.bucket).toBe(1);
    expect(highest?.bucket).toBe(4);
  });
});
