import { computeReviewStreaks } from './ankifyStreak';

describe('computeReviewStreaks', () => {
  test('empty input yields zero streaks', () => {
    expect(computeReviewStreaks([], '2026-06-12')).toEqual({
      currentStreak: 0,
      longestStreak: 0,
    });
  });

  test('a run ending today counts as the current streak', () => {
    const byDay: Array<[string, number]> = [
      ['2026-06-12', 3],
      ['2026-06-11', 5],
      ['2026-06-10', 1],
    ];
    expect(computeReviewStreaks(byDay, '2026-06-12')).toEqual({
      currentStreak: 3,
      longestStreak: 3,
    });
  });

  test('a run ending yesterday keeps the current streak alive', () => {
    const byDay: Array<[string, number]> = [
      ['2026-06-11', 5],
      ['2026-06-10', 1],
    ];
    expect(computeReviewStreaks(byDay, '2026-06-12')).toEqual({
      currentStreak: 2,
      longestStreak: 2,
    });
  });

  test('a run ending two days ago does not count as current', () => {
    const byDay: Array<[string, number]> = [
      ['2026-06-10', 5],
      ['2026-06-09', 1],
    ];
    expect(computeReviewStreaks(byDay, '2026-06-12')).toEqual({
      currentStreak: 0,
      longestStreak: 2,
    });
  });

  test('a gap splits runs and longest wins', () => {
    const byDay: Array<[string, number]> = [
      ['2026-06-12', 1],
      ['2026-06-11', 1],
      ['2026-06-08', 1],
      ['2026-06-07', 1],
      ['2026-06-06', 1],
      ['2026-06-05', 1],
    ];
    expect(computeReviewStreaks(byDay, '2026-06-12')).toEqual({
      currentStreak: 2,
      longestStreak: 4,
    });
  });

  test('a day with zero reviews does not extend a streak', () => {
    const byDay: Array<[string, number]> = [
      ['2026-06-12', 0],
      ['2026-06-11', 4],
    ];
    expect(computeReviewStreaks(byDay, '2026-06-12')).toEqual({
      currentStreak: 1,
      longestStreak: 1,
    });
  });

  test('unordered input is handled by sorting on the day key', () => {
    const byDay: Array<[string, number]> = [
      ['2026-06-10', 1],
      ['2026-06-12', 1],
      ['2026-06-11', 1],
    ];
    expect(computeReviewStreaks(byDay, '2026-06-12')).toEqual({
      currentStreak: 3,
      longestStreak: 3,
    });
  });

  test('a single review today is a one-day streak', () => {
    expect(computeReviewStreaks([['2026-06-12', 7]], '2026-06-12')).toEqual({
      currentStreak: 1,
      longestStreak: 1,
    });
  });
});
