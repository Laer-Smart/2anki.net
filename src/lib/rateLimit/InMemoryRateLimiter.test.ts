import { InMemoryRateLimiter } from './InMemoryRateLimiter';

describe('InMemoryRateLimiter', () => {
  test('allows up to perKeyMax within the window for a single key', () => {
    const limiter = new InMemoryRateLimiter({
      windowMs: 1000,
      perKeyMax: 3,
      globalMax: 100,
      now: () => 0,
    });
    expect(limiter.check('ip-a')).toBe(true);
    expect(limiter.check('ip-a')).toBe(true);
    expect(limiter.check('ip-a')).toBe(true);
    expect(limiter.check('ip-a')).toBe(false);
  });

  test('isolates buckets between distinct keys', () => {
    const limiter = new InMemoryRateLimiter({
      windowMs: 1000,
      perKeyMax: 2,
      globalMax: 100,
      now: () => 0,
    });
    expect(limiter.check('ip-a')).toBe(true);
    expect(limiter.check('ip-a')).toBe(true);
    expect(limiter.check('ip-a')).toBe(false);
    expect(limiter.check('ip-b')).toBe(true);
    expect(limiter.check('ip-b')).toBe(true);
    expect(limiter.check('ip-b')).toBe(false);
  });

  test('resets the per-key bucket once the window elapses', () => {
    let now = 0;
    const limiter = new InMemoryRateLimiter({
      windowMs: 1000,
      perKeyMax: 1,
      globalMax: 100,
      now: () => now,
    });
    expect(limiter.check('ip-a')).toBe(true);
    expect(limiter.check('ip-a')).toBe(false);
    now = 1001;
    expect(limiter.check('ip-a')).toBe(true);
  });

  test('rejects all callers once the global cap is reached', () => {
    const limiter = new InMemoryRateLimiter({
      windowMs: 1000,
      perKeyMax: 10,
      globalMax: 2,
      now: () => 0,
    });
    expect(limiter.check('ip-a')).toBe(true);
    expect(limiter.check('ip-b')).toBe(true);
    expect(limiter.check('ip-c')).toBe(false);
  });
});
