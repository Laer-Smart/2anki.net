import { describe, expect, test } from 'vitest';

import { reviewBucket, buildHeatmapWeeks } from './heatmap';

describe('reviewBucket', () => {
  test('zero reviews map to bucket 0', () => {
    expect(reviewBucket(0)).toBe(0);
  });

  test('1 to 4 reviews map to bucket 1', () => {
    expect(reviewBucket(1)).toBe(1);
    expect(reviewBucket(4)).toBe(1);
  });

  test('5 to 14 reviews map to bucket 2', () => {
    expect(reviewBucket(5)).toBe(2);
    expect(reviewBucket(14)).toBe(2);
  });

  test('15 to 29 reviews map to bucket 3', () => {
    expect(reviewBucket(15)).toBe(3);
    expect(reviewBucket(29)).toBe(3);
  });

  test('30 or more reviews map to bucket 4', () => {
    expect(reviewBucket(30)).toBe(4);
    expect(reviewBucket(500)).toBe(4);
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
});
