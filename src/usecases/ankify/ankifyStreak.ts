export interface ReviewStreaks {
  currentStreak: number;
  longestStreak: number;
}

const MS_PER_DAY = 86_400_000;

const dayKeyToUtc = (day: string): number => Date.parse(`${day}T00:00:00Z`);

const isConsecutive = (earlier: string, later: string): boolean =>
  dayKeyToUtc(later) - dayKeyToUtc(earlier) === MS_PER_DAY;

const previousDayKey = (day: string): string =>
  new Date(dayKeyToUtc(day) - MS_PER_DAY).toISOString().slice(0, 10);

export function computeReviewStreaks(
  reviewsByDay: Array<[string, number]>,
  today: string
): ReviewStreaks {
  const activeDays = reviewsByDay
    .filter(([, count]) => count > 0)
    .map(([day]) => day)
    .sort();

  if (activeDays.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  let longestStreak = 1;
  let runLength = 1;
  for (let i = 1; i < activeDays.length; i++) {
    if (isConsecutive(activeDays[i - 1], activeDays[i])) {
      runLength += 1;
    } else {
      runLength = 1;
    }
    longestStreak = Math.max(longestStreak, runLength);
  }

  const lastActiveDay = activeDays[activeDays.length - 1];
  const yesterday = previousDayKey(today);
  const endsRecently = lastActiveDay === today || lastActiveDay === yesterday;

  let currentStreak = 0;
  if (endsRecently) {
    currentStreak = 1;
    for (let i = activeDays.length - 1; i > 0; i--) {
      if (isConsecutive(activeDays[i - 1], activeDays[i])) {
        currentStreak += 1;
      } else {
        break;
      }
    }
  }

  return { currentStreak, longestStreak };
}
