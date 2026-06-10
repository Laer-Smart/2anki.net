import {
  LEGACY_LOCK_IN_CUTOVER,
  LEGACY_LOCK_IN_WINDOW_END,
  qualifiesForLegacyWindow,
  resolveCohort,
} from './pricingV2';

const beforeCutover = new Date('2026-06-10T00:00:00Z');
const afterCutover = new Date('2026-06-16T00:00:00Z');

describe('qualifiesForLegacyWindow', () => {
  it('is true for an account created before cutover, asked during the window', () => {
    expect(
      qualifiesForLegacyWindow({
        createdAt: beforeCutover,
        now: new Date('2026-06-18T00:00:00Z'),
      })
    ).toBe(true);
  });

  it('is false for an account created before cutover but asked after the window ends', () => {
    expect(
      qualifiesForLegacyWindow({
        createdAt: beforeCutover,
        now: new Date('2026-06-22T00:00:00Z'),
      })
    ).toBe(false);
  });

  it('is false for an account created after cutover', () => {
    expect(
      qualifiesForLegacyWindow({
        createdAt: afterCutover,
        now: new Date('2026-06-18T00:00:00Z'),
      })
    ).toBe(false);
  });

  it('is false when created_at is null', () => {
    expect(
      qualifiesForLegacyWindow({
        createdAt: null,
        now: new Date('2026-06-18T00:00:00Z'),
      })
    ).toBe(false);
  });

  it('treats the cutover boundary as exclusive (created exactly at cutover does not qualify)', () => {
    expect(
      qualifiesForLegacyWindow({
        createdAt: LEGACY_LOCK_IN_CUTOVER,
        now: new Date('2026-06-18T00:00:00Z'),
      })
    ).toBe(false);
  });

  it('treats the window end as exclusive (asking exactly at window end does not qualify)', () => {
    expect(
      qualifiesForLegacyWindow({
        createdAt: beforeCutover,
        now: LEGACY_LOCK_IN_WINDOW_END,
      })
    ).toBe(false);
  });
});

describe('resolveCohort', () => {
  it('returns legacy for everyone when the flag is off', () => {
    expect(
      resolveCohort({
        flagOn: false,
        createdAt: afterCutover,
        now: new Date('2026-06-30T00:00:00Z'),
      })
    ).toBe('legacy');
  });

  it('returns legacy for a pre-cutover user inside the window when the flag is on', () => {
    expect(
      resolveCohort({
        flagOn: true,
        createdAt: beforeCutover,
        now: new Date('2026-06-18T00:00:00Z'),
      })
    ).toBe('legacy');
  });

  it('returns v2 for a pre-cutover user after the window when the flag is on', () => {
    expect(
      resolveCohort({
        flagOn: true,
        createdAt: beforeCutover,
        now: new Date('2026-06-22T00:00:00Z'),
      })
    ).toBe('v2');
  });

  it('returns v2 for a post-cutover user when the flag is on', () => {
    expect(
      resolveCohort({
        flagOn: true,
        createdAt: afterCutover,
        now: new Date('2026-06-18T00:00:00Z'),
      })
    ).toBe('v2');
  });
});
