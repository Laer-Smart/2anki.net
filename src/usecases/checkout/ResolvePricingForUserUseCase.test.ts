import { resolvePricingForUser } from './ResolvePricingForUserUseCase';

const beforeCutover = new Date('2026-06-09T00:00:00Z');
const afterCutover = new Date('2026-06-16T00:00:00Z');
const insideWindow = new Date('2026-06-18T00:00:00Z');
const afterWindow = new Date('2026-06-22T00:00:00Z');

describe('resolvePricingForUser', () => {
  it('returns legacy amounts and a lock-in deadline for a pre-cutover user in the window', () => {
    const result = resolvePricingForUser({
      flagOn: true,
      createdAt: beforeCutover,
      now: insideWindow,
    });

    expect(result).toEqual({
      cohort: 'legacy',
      monthlyCents: 600,
      annualCents: 6000,
      lockInDeadline: '2026-06-21T21:59:00.000Z',
    });
  });

  it('returns v2 amounts and no deadline for a post-cutover user', () => {
    const result = resolvePricingForUser({
      flagOn: true,
      createdAt: afterCutover,
      now: insideWindow,
    });

    expect(result).toEqual({
      cohort: 'v2',
      monthlyCents: 799,
      annualCents: 6400,
      lockInDeadline: null,
    });
  });

  it('returns v2 amounts for a pre-cutover user after the window closes', () => {
    const result = resolvePricingForUser({
      flagOn: true,
      createdAt: beforeCutover,
      now: afterWindow,
    });

    expect(result.cohort).toBe('v2');
    expect(result.monthlyCents).toBe(799);
    expect(result.lockInDeadline).toBeNull();
  });

  it('returns legacy amounts and no deadline for everyone when the flag is off', () => {
    const result = resolvePricingForUser({
      flagOn: false,
      createdAt: afterCutover,
      now: insideWindow,
    });

    expect(result).toEqual({
      cohort: 'legacy',
      monthlyCents: 600,
      annualCents: 6000,
      lockInDeadline: null,
    });
  });
});
