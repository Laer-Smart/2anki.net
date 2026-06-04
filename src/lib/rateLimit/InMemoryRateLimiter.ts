interface RateBucket {
  count: number;
  resetAt: number;
}

export interface RateLimiter {
  check(key: string): boolean;
}

export interface RateLimiterOptions {
  windowMs: number;
  perKeyMax: number;
  globalMax: number;
  now?: () => number;
}

export class InMemoryRateLimiter implements RateLimiter {
  private readonly buckets = new Map<string, RateBucket>();
  private globalBucket: RateBucket;
  private readonly windowMs: number;
  private readonly perKeyMax: number;
  private readonly globalMax: number;
  private readonly now: () => number;

  constructor(options: RateLimiterOptions) {
    this.windowMs = options.windowMs;
    this.perKeyMax = options.perKeyMax;
    this.globalMax = options.globalMax;
    this.now = options.now ?? (() => Date.now());
    this.globalBucket = { count: 0, resetAt: this.now() + this.windowMs };
  }

  check(key: string): boolean {
    const now = this.now();

    if (now >= this.globalBucket.resetAt) {
      this.globalBucket = { count: 0, resetAt: now + this.windowMs };
    }
    if (this.globalBucket.count >= this.globalMax) {
      return false;
    }
    this.globalBucket.count += 1;

    const existing = this.buckets.get(key);
    if (existing == null || now >= existing.resetAt) {
      this.buckets.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }
    if (existing.count >= this.perKeyMax) {
      this.globalBucket.count -= 1;
      return false;
    }
    existing.count += 1;
    return true;
  }
}
