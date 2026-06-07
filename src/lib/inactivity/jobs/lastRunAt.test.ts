import { isOverdue } from './lastRunAt';

describe('isOverdue', () => {
  const intervalMs = 24 * 60 * 60 * 1000;
  const now = new Date('2026-06-07T12:00:00Z').getTime();

  it('is overdue when there is no recorded run', () => {
    expect(isOverdue(null, intervalMs, now)).toBe(true);
  });

  it('is overdue when the last run is exactly one interval ago', () => {
    const lastRun = new Date(now - intervalMs);
    expect(isOverdue(lastRun, intervalMs, now)).toBe(true);
  });

  it('is overdue when the last run is more than one interval ago', () => {
    const lastRun = new Date(now - intervalMs - 1);
    expect(isOverdue(lastRun, intervalMs, now)).toBe(true);
  });

  it('is not overdue when the last run is within the interval', () => {
    const lastRun = new Date(now - intervalMs + 1);
    expect(isOverdue(lastRun, intervalMs, now)).toBe(false);
  });
});
