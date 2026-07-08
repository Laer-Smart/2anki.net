import type { IEventsMetricsRepository } from '../../data_layer/EventsMetricsRepository';
import type { IJobsMetricsRepository } from '../../data_layer/JobsMetricsRepository';
import type { ConversionErrorCount } from './ConversionMetricsService';
import { ConversionMetricsService } from './ConversionMetricsService';

function makeFailingRepo(): IJobsMetricsRepository {
  return {
    countFreeConversions7d: jest.fn().mockRejectedValue(new Error('db down')),
    countPaidConversions7d: jest.fn().mockRejectedValue(new Error('db down')),
    computeFreeSuccessRate7d: jest.fn().mockRejectedValue(new Error('db down')),
    computePaidSuccessRate7d: jest.fn().mockRejectedValue(new Error('db down')),
    countFreePlanBlocked7d: jest.fn().mockRejectedValue(new Error('db down')),
    countPaidPlanBlocked7d: jest.fn().mockRejectedValue(new Error('db down')),
    topFailureReasons7d: jest.fn().mockRejectedValue(new Error('db down')),
    failedConversionsWeekly: jest.fn().mockRejectedValue(new Error('db down')),
  };
}

function makeStubRepo(
  overrides: Partial<IJobsMetricsRepository> = {}
): IJobsMetricsRepository {
  return {
    countFreeConversions7d: jest.fn().mockResolvedValue(0),
    countPaidConversions7d: jest.fn().mockResolvedValue(0),
    computeFreeSuccessRate7d: jest.fn().mockResolvedValue(null),
    computePaidSuccessRate7d: jest.fn().mockResolvedValue(null),
    countFreePlanBlocked7d: jest.fn().mockResolvedValue(0),
    countPaidPlanBlocked7d: jest.fn().mockResolvedValue(0),
    topFailureReasons7d: jest.fn().mockResolvedValue([]),
    failedConversionsWeekly: jest.fn().mockResolvedValue([]),
    ...overrides,
  };
}

function makeFailingEventsRepo(): IEventsMetricsRepository {
  return {
    medianMinutesToFirstDeck: jest.fn().mockRejectedValue(new Error('db down')),
    uploadToDownloadRate: jest.fn().mockRejectedValue(new Error('db down')),
  };
}

function makeStubEventsRepo(
  overrides: Partial<IEventsMetricsRepository> = {}
): IEventsMetricsRepository {
  return {
    medianMinutesToFirstDeck: jest.fn().mockResolvedValue(null),
    uploadToDownloadRate: jest.fn().mockResolvedValue(null),
    ...overrides,
  };
}

describe('ConversionMetricsService — graceful failure', () => {
  it('returns null for every metric when the repository throws', async () => {
    const service = new ConversionMetricsService(
      makeFailingRepo(),
      makeFailingEventsRepo()
    );
    const metrics = await service.getMetrics();

    expect(metrics.free_conversions_7d).toBeNull();
    expect(metrics.paid_conversions_7d).toBeNull();
    expect(metrics.free_conversion_success_rate_7d).toBeNull();
    expect(metrics.paid_conversion_success_rate_7d).toBeNull();
    expect(metrics.free_blocked_by_plan_7d).toBeNull();
    expect(metrics.paid_blocked_by_plan_7d).toBeNull();
    expect(metrics.conversion_errors_7d_top_reasons).toBeNull();
    expect(metrics.failed_conversions_weekly).toBeNull();
    expect(metrics.time_to_first_deck_median_minutes_30d).toBeNull();
    expect(metrics.upload_to_download_rate_7d).toBeNull();
  });
});

describe('ConversionMetricsService — shape assembly', () => {
  it('passes through free conversion count from the repository', async () => {
    const service = new ConversionMetricsService(
      makeStubRepo({ countFreeConversions7d: jest.fn().mockResolvedValue(7) }),
      makeStubEventsRepo()
    );

    const metrics = await service.getMetrics();

    expect(metrics.free_conversions_7d).toBe(7);
  });

  it('passes through paid conversion count from the repository', async () => {
    const service = new ConversionMetricsService(
      makeStubRepo({ countPaidConversions7d: jest.fn().mockResolvedValue(3) }),
      makeStubEventsRepo()
    );

    const metrics = await service.getMetrics();

    expect(metrics.paid_conversions_7d).toBe(3);
  });

  it('passes through free success rate from the repository', async () => {
    const service = new ConversionMetricsService(
      makeStubRepo({
        computeFreeSuccessRate7d: jest.fn().mockResolvedValue(66.7),
      }),
      makeStubEventsRepo()
    );

    const metrics = await service.getMetrics();

    expect(metrics.free_conversion_success_rate_7d).toBe(66.7);
  });

  it('passes through the plan-blocked counts per tier from the repository', async () => {
    const service = new ConversionMetricsService(
      makeStubRepo({
        countFreePlanBlocked7d: jest.fn().mockResolvedValue(18),
        countPaidPlanBlocked7d: jest.fn().mockResolvedValue(2),
      }),
      makeStubEventsRepo()
    );

    const metrics = await service.getMetrics();

    expect(metrics.free_blocked_by_plan_7d).toBe(18);
    expect(metrics.paid_blocked_by_plan_7d).toBe(2);
  });

  it('passes through top failure reasons from the repository', async () => {
    const reasons: ConversionErrorCount[] = [
      { reason: 'rate limit', count: 5 },
      { reason: 'timeout', count: 2 },
    ];
    const service = new ConversionMetricsService(
      makeStubRepo({
        topFailureReasons7d: jest.fn().mockResolvedValue(reasons),
      }),
      makeStubEventsRepo()
    );

    const metrics = await service.getMetrics();

    expect(metrics.conversion_errors_7d_top_reasons).toEqual(reasons);
  });

  it('produces a 12-week time series with zeroes for weeks with no data', async () => {
    const service = new ConversionMetricsService(
      makeStubRepo({
        failedConversionsWeekly: jest.fn().mockResolvedValue([]),
      }),
      makeStubEventsRepo()
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
      failedConversionsWeekly: jest
        .fn()
        .mockResolvedValue([{ weekStart: currentMonday, count: 4 }]),
    });

    const service = new ConversionMetricsService(repo, makeStubEventsRepo());
    const metrics = await service.getMetrics();

    const weekly = metrics.failed_conversions_weekly ?? [];
    const lastPoint = weekly[weekly.length - 1];
    expect(lastPoint?.count).toBe(4);
    expect(lastPoint?.week).toBe('2025-05-19');

    jest.useRealTimers();
  });

  it('passes through the time-to-first-deck median from the events repository', async () => {
    const service = new ConversionMetricsService(
      makeStubRepo(),
      makeStubEventsRepo({
        medianMinutesToFirstDeck: jest.fn().mockResolvedValue(42.5),
      })
    );

    const metrics = await service.getMetrics();

    expect(metrics.time_to_first_deck_median_minutes_30d).toBe(42.5);
  });

  it('passes through the upload-to-download rate from the events repository', async () => {
    const service = new ConversionMetricsService(
      makeStubRepo(),
      makeStubEventsRepo({
        uploadToDownloadRate: jest.fn().mockResolvedValue(25),
      })
    );

    const metrics = await service.getMetrics();

    expect(metrics.upload_to_download_rate_7d).toBe(25);
  });

  it('queries the median over a 30-day cohort and the rate over 7 days', async () => {
    const now = new Date('2025-05-19T00:00:00.000Z');
    jest.useFakeTimers();
    jest.setSystemTime(now);

    const eventsRepo = makeStubEventsRepo();
    const service = new ConversionMetricsService(makeStubRepo(), eventsRepo);

    await service.getMetrics();

    expect(eventsRepo.medianMinutesToFirstDeck).toHaveBeenCalledWith(
      new Date('2025-04-19T00:00:00.000Z')
    );
    expect(eventsRepo.uploadToDownloadRate).toHaveBeenCalledWith(
      new Date('2025-05-12T00:00:00.000Z')
    );

    jest.useRealTimers();
  });
});
