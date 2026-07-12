import type {
  ILandingPageYieldRepository,
  LandingPageYieldRow,
} from '../../data_layer/LandingPageYieldRepository';
import { LandingPageYieldService } from './LandingPageYieldService';

function buildService(
  rows: LandingPageYieldRow[] | Error
): LandingPageYieldService {
  const repo: ILandingPageYieldRepository = {
    groupByOrigin: async () => {
      if (rows instanceof Error) throw rows;
      return rows;
    },
  };
  return new LandingPageYieldService({ repo });
}

describe('LandingPageYieldService', () => {
  const since = new Date('2026-06-01T00:00:00.000Z');

  it('maps rows and computes the deduplicated paid conversion rate', async () => {
    const service = buildService([
      {
        origin: '/pdf-to-anki',
        signups: 200,
        subscription_conversions: 30,
        pass_conversions: 10,
        paid_conversions: 35,
      },
      {
        origin: null,
        signups: 100,
        subscription_conversions: 0,
        pass_conversions: 0,
        paid_conversions: 0,
      },
    ]);

    const result = await service.getMetrics(since);

    expect(result.error).toBeUndefined();
    expect(result.since).toBe('2026-06-01T00:00:00.000Z');
    expect(result.pages).toEqual([
      {
        origin: '/pdf-to-anki',
        signups: 200,
        subscription_conversions: 30,
        pass_conversions: 10,
        paid_conversion_rate_pct: 18,
      },
      {
        origin: null,
        signups: 100,
        subscription_conversions: 0,
        pass_conversions: 0,
        paid_conversion_rate_pct: 0,
      },
    ]);
  });

  it('returns a 0 rate when a page has no signups', async () => {
    const service = buildService([
      {
        origin: '/dead-page',
        signups: 0,
        subscription_conversions: 0,
        pass_conversions: 0,
        paid_conversions: 0,
      },
    ]);

    const result = await service.getMetrics(since);

    expect(result.pages?.[0].paid_conversion_rate_pct).toBe(0);
  });

  it('returns the error field and a null pages list when the repo throws', async () => {
    const service = buildService(
      new Error('relation "user_passes" does not exist')
    );

    const result = await service.getMetrics(since);

    expect(result.pages).toBeNull();
    expect(result.error).toBe('relation "user_passes" does not exist');
  });
});
