import { InvalidScheduleTimeError } from '../../ankify/nextDailyRunAt';

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

const DAYS_PER_WEEK = 7;

export class InvalidWeekdayError extends Error {
  constructor(value: number) {
    super(
      `Invalid weekday "${value}"; expected 0 (Sunday) through 6 (Saturday)`
    );
    this.name = 'InvalidWeekdayError';
  }
}

export const nextWeeklyRunAt = (
  targetWeekday: number,
  timeOfDayUtc: string,
  now: Date = new Date()
): Date => {
  if (
    !Number.isInteger(targetWeekday) ||
    targetWeekday < 0 ||
    targetWeekday > 6
  ) {
    throw new InvalidWeekdayError(targetWeekday);
  }
  const match = TIME_PATTERN.exec(timeOfDayUtc);
  if (match == null) {
    throw new InvalidScheduleTimeError(timeOfDayUtc);
  }
  const targetHour = Number(match[1]);
  const targetMinute = Number(match[2]);

  const daysAhead =
    (targetWeekday - now.getUTCDay() + DAYS_PER_WEEK) % DAYS_PER_WEEK;

  const candidate = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + daysAhead,
      targetHour,
      targetMinute,
      0,
      0
    )
  );

  if (candidate.getTime() <= now.getTime()) {
    candidate.setUTCDate(candidate.getUTCDate() + DAYS_PER_WEEK);
  }

  return candidate;
};
