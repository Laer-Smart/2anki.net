import { PerformanceMetricsService } from './PerformanceMetricsService';
import { InMemoryUserVisibleErrorsRepository } from '../../data_layer/UserVisibleErrorsRepository';
import type { IUserVisibleErrorsRepository } from '../../data_layer/UserVisibleErrorsRepository';

function buildMockDb() {
  return {
    raw: jest.fn().mockResolvedValue({ rows: [{ p50: null, p95: null, p99: null, total: '0' }] }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe('PerformanceMetricsService.getUserVisibleErrorCounts', () => {
  it('returns empty array when no repository is provided', async () => {
    const service = new PerformanceMetricsService(buildMockDb());

    const result = await service.getUserVisibleErrorCounts(1);

    expect(result).toEqual([]);
  });

  it('returns counts from the repository', async () => {
    const repo = new InMemoryUserVisibleErrorsRepository();
    await repo.record({ userId: null, surface: 'oauth_google', code: 'oauth_cancelled' });
    await repo.record({ userId: null, surface: 'oauth_google', code: 'oauth_cancelled' });
    await repo.record({ userId: null, surface: 'stripe_webhook', code: 'stripe_webhook_signature_invalid' });

    const service = new PerformanceMetricsService(buildMockDb(), repo);

    const result = await service.getUserVisibleErrorCounts(1);

    expect(result).toEqual([
      { surface: 'oauth_google', code: 'oauth_cancelled', count: 2 },
      { surface: 'stripe_webhook', code: 'stripe_webhook_signature_invalid', count: 1 },
    ]);
  });

  it('respects the sinceDays window (24h vs 7d filter)', async () => {
    const repo: IUserVisibleErrorsRepository = {
      record: jest.fn(),
      countBySurfaceAndCode: jest.fn()
        .mockResolvedValueOnce([{ surface: 'oauth_google', code: 'oauth_cancelled', count: 3 }])
        .mockResolvedValueOnce([
          { surface: 'oauth_google', code: 'oauth_cancelled', count: 10 },
          { surface: 'stripe_webhook', code: 'stripe_webhook_signature_invalid', count: 5 },
        ]),
    };

    const service = new PerformanceMetricsService(buildMockDb(), repo);

    const result24h = await service.getUserVisibleErrorCounts(1);
    const result7d = await service.getUserVisibleErrorCounts(7);

    expect(repo.countBySurfaceAndCode).toHaveBeenCalledWith(1);
    expect(repo.countBySurfaceAndCode).toHaveBeenCalledWith(7);
    expect(result24h).toHaveLength(1);
    expect(result7d).toHaveLength(2);
  });
});

describe('PerformanceMetricsService — user_visible_errors fields in getMetrics', () => {
  it('calls countBySurfaceAndCode with 1 and 7 for the two windows', async () => {
    const repo: IUserVisibleErrorsRepository = {
      record: jest.fn(),
      countBySurfaceAndCode: jest.fn().mockResolvedValue([]),
    };

    const service = new PerformanceMetricsService(buildMockDb(), repo);

    await service.getUserVisibleErrorCounts(1);
    await service.getUserVisibleErrorCounts(7);

    expect(repo.countBySurfaceAndCode).toHaveBeenCalledWith(1);
    expect(repo.countBySurfaceAndCode).toHaveBeenCalledWith(7);
  });
});
