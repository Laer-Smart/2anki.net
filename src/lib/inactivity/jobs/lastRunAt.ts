export type LastRunAt = () => Promise<Date | null>;

export const isOverdue = (
  lastRun: Date | null,
  intervalMs: number,
  now: number
): boolean => {
  if (lastRun == null) return true;
  return now - lastRun.getTime() >= intervalMs;
};
