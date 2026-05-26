import type { IJobsMetricsRepository } from '../../data_layer/JobsMetricsRepository';
import type { ConversionErrorCount } from './ConversionMetricsService';
import { ConversionMetricsService } from './ConversionMetricsService';

function makeFailingRepo(): IJobsMetricsRepository {
  return {
    countFreeConversions7d: jest.fn().mockRejectedValue(new Error('db down')),
    countPaidConversions7d: jest.fn().mockRejectedValue(new Error('db down')),
    computeFreeSuccessRate7d: jest.fn().mockRejectedValue(new Error('db down')),
    computePaidSuccessRate7d: jest.fn().mockRejectedValue(new Error('db down')),
    topFailureReasons7d: jest.fn().mockRejectedValue(new Error('db down')),
    failedConversionsWeekly: jest.fn().mockRejectedValue(new Error('db down')),
  };
}

function makeStubRepo(overrides: Partial<IJobsMetricsRepository> = {}): IJobsMetricsRepository {
  return {
    countFreeConversions7d: jest.fn().mockResolvedValue(0),
    countPaidConversions7d: jest.fn().mockResolvedValue(0),
    computeFreeSuccessRate7d: jest.fn().mockResolvedValue(null),
    computePaidSuccessRate7d: jest.fn().mockResolvedValue(null),
    topFailureReasons7d: jest.fn().mockResolvedValue([]),
    failedConversionsWeekly: jest.fn().mockResolvedValue([]),
    ...overrides,
  };
}

describe('ConversionMetricsService — graceful failure', () => {
  it('returns null for every metric when the repository throws', async () => {
    const service = new ConversionMetricsService(makeFailingRepo());
    const metrics = await service.getMetrics();

    expect(metrics.free_conversions_7d).toBeNull();
    expect(metrics.paid_conversions_7d).toBeNull();
    expect(metrics.free_conversion_success_rate_7d).toBeNull();
    expect(metrics.paid_conversion_success_rate_7d).toBeNull();
    expect(metrics.conversion_errors_7d_top_reasons).toBeNull();
    expect(metrics.failed_conversions_weekly).toBeNull();
  });
});

describe('ConversionMetricsService — shape assembly', () => {
  it('passes through free conversion count from the repository', async () => {
    const service = new ConversionMetricsService(
      makeStubRepo({ countFreeConversions7d: jest.fn().mockResolvedValue(7) })
    );

    const metrics = await service.getMetrics();

    expect(metrics.free_conversions_7d).toBe(7);
  });

  it('passes through paid conversion count from the repository', async () => {
    const service = new ConversionMetricsService(
      makeStubRepo({ countPaidConversions7d: jest.fn().mockResolvedValue(3) })
    );

    const metrics = await service.getMetrics();

    expect(metrics.paid_conversions_7d).toBe(3);
  });

  it('passes through free success rate from the repository', async () => {
    const service = new ConversionMetricsService(
      makeStubRepo({ computeFreeSuccessRate7d: jest.fn().mockResolvedValue(66.7) })
    );

    const metrics = await service.getMetrics();

    expect(metrics.free_conversion_success_rate_7d).toBe(66.7);
  });

  it('passes through top failure reasons from the repository', async () => {
    const reasons: ConversionErrorCount[] = [
      { reason: 'rate limit', count: 5 },
      { reason: 'timeout', count: 2 },
    ];
    const service = new ConversionMetricsService(
      makeStubRepo({ topFailureReasons7d: jest.fn().mockResolvedValue(reasons) })
    );

    const metrics = await service.getMetrics();

    expect(metrics.conversion_errors_7d_top_reasons).toEqual(reasons);
  });

  it('produces a 12-week time series with zeroes for weeks with no data', async () => {
    const service = new ConversionMetricsService(
      makeStubRepo({ failedConversionsWeekly: jest.fn().mockResolvedValue([]) })
    );

    const metrics = await service.getMetrics();

    expect(metrics.failed_conversions_weekly).toHaveLength(12);
    expect(
      metrics.failed_conversions_weekly?.every((pt) => pt.count === 0)
    ).toBe(true);
  });

  it('fills in counts for weeks that have data', async () => {
    const now = new Date('2025-05-19T00:00:00.000Z');
    jest.useFakeTimers();
    jest.setSystemTime(now);

    const currentMonday = new Date('2025-05-19T00:00:00.000Z');
    const repo = makeStubRepo({
      failedConversionsWeekly: jest.fn().mockResolvedValue([
        { weekStart: currentMonday, count: 4 },
      ]),
    });

    const service = new ConversionMetricsService(repo);
    const metrics = await service.getMetrics();

    const weekly = metrics.failed_conversions_weekly ?? [];
    const lastPoint = weekly[weekly.length - 1];
    expect(lastPoint?.count).toBe(4);
    expect(lastPoint?.week).toBe('2025-05-19');

    jest.useRealTimers();
  });
});
