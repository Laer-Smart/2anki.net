import { describe, expect, it } from 'vitest';
import { formatResetDate } from './formatResetDate';

describe('formatResetDate', () => {
  it('formats a UTC ISO boundary to absolute long form', () => {
    expect(formatResetDate('2026-07-01T00:00:00.000Z')).toBe('1 July 2026');
  });

  it('keeps the calendar day stable across timezones by reading UTC', () => {
    expect(formatResetDate('2026-12-01T00:00:00.000Z')).toBe('1 December 2026');
  });

  it('returns null when the date is missing', () => {
    expect(formatResetDate(undefined)).toBeNull();
  });

  it('returns null for an unparseable string', () => {
    expect(formatResetDate('not-a-date')).toBeNull();
  });
});
