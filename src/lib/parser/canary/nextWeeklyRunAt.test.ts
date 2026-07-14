import { nextWeeklyRunAt, InvalidWeekdayError } from './nextWeeklyRunAt';
import { InvalidScheduleTimeError } from '../../ankify/nextDailyRunAt';

describe('nextWeeklyRunAt', () => {
  test('returns the next occurrence of the target weekday and time', () => {
    const now = new Date('2026-07-14T12:00:00Z');
    const next = nextWeeklyRunAt(1, '03:30', now);
    expect(next.toISOString()).toBe('2026-07-20T03:30:00.000Z');
    expect(next.getUTCDay()).toBe(1);
  });

  test('returns later the same day when the target time is still ahead', () => {
    const now = new Date('2026-07-13T01:00:00Z');
    const next = nextWeeklyRunAt(1, '03:30', now);
    expect(next.toISOString()).toBe('2026-07-13T03:30:00.000Z');
  });

  test('rolls to next week when the target time already passed today', () => {
    const now = new Date('2026-07-13T04:00:00Z');
    const next = nextWeeklyRunAt(1, '03:30', now);
    expect(next.toISOString()).toBe('2026-07-20T03:30:00.000Z');
  });

  test('throws on an out-of-range weekday', () => {
    expect(() => nextWeeklyRunAt(7, '03:30', new Date())).toThrow(
      InvalidWeekdayError
    );
  });

  test('throws on a malformed time', () => {
    expect(() => nextWeeklyRunAt(1, '25:00', new Date())).toThrow(
      InvalidScheduleTimeError
    );
  });
});
