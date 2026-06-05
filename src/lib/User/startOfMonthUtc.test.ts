import { startOfMonthUtc } from './startOfMonthUtc';

describe('startOfMonthUtc', () => {
  it.each([
    ['2026-06-05T13:45:00Z', '2026-06-01T00:00:00.000Z'],
    ['2026-06-01T00:00:00Z', '2026-06-01T00:00:00.000Z'],
    ['2026-12-31T23:59:59Z', '2026-12-01T00:00:00.000Z'],
  ])('truncates %s to %s', (input, expected) => {
    expect(startOfMonthUtc(new Date(input)).toISOString()).toBe(expected);
  });
});
