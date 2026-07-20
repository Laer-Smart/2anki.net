import { EventsSink, EVENTS_FLUSH_THRESHOLD } from './EventsSink';
import { IEventsRepository, EventRow } from '../../data_layer/EventsRepository';

function makeFakeRepository() {
  const inserted: EventRow[][] = [];
  const repo: IEventsRepository = {
    insertEvents: jest.fn(async (rows) => {
      inserted.push([...rows]);
    }),
    countByName: jest.fn(async () => 0),
    countDistinctUsers: jest.fn(async () => 0),
    countByNameForUser: jest.fn(async () => 0),
    lastEventAt: jest.fn(async () => null),
    groupPaywallShownByVariantAndSurface: jest.fn(async () => []),
    groupPaywallClicksByVariant: jest.fn(async () => []),
    groupUploadFunnel: jest.fn(async () => []),
    groupUploadFunnelByOrigin: jest.fn(async () => []),
    groupConversionFailedByReason: jest.fn(async () => ({
      paywall: 0,
      empty: 0,
      technical: 0,
    })),
  };
  return { repo, inserted };
}

const baseRow: EventRow = {
  name: 'conversion_succeeded',
  user_id: 1,
  anonymous_id: null,
  props: { source: 'upload' },
};

describe('EventsSink', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not flush when buffer is below threshold', async () => {
    const { repo, inserted } = makeFakeRepository();
    const sink = new EventsSink(repo, { flushThreshold: 3 });
    sink.record(baseRow);
    sink.record(baseRow);
    expect(inserted).toHaveLength(0);
  });

  it('flushes when buffer reaches threshold', async () => {
    const { repo, inserted } = makeFakeRepository();
    const sink = new EventsSink(repo, { flushThreshold: 2 });
    sink.record(baseRow);
    sink.record(baseRow);
    await sink.waitForPendingFlush();
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toHaveLength(2);
  });

  it('flushes on timer interval', async () => {
    const { repo, inserted } = makeFakeRepository();
    const sink = new EventsSink(repo, {
      flushThreshold: EVENTS_FLUSH_THRESHOLD,
      flushIntervalMs: 1000,
    });
    sink.start();
    sink.record(baseRow);
    jest.advanceTimersByTime(1001);
    await Promise.resolve();
    sink.stop();
    expect(repo.insertEvents).toHaveBeenCalled();
    expect(inserted[0]).toHaveLength(1);
  });

  it('does not flush on interval when buffer is empty', async () => {
    const { repo } = makeFakeRepository();
    const sink = new EventsSink(repo, { flushIntervalMs: 500 });
    sink.start();
    jest.advanceTimersByTime(600);
    await Promise.resolve();
    sink.stop();
    expect(repo.insertEvents).not.toHaveBeenCalled();
  });

  it('tolerates repository errors without throwing', async () => {
    const repo: IEventsRepository = {
      insertEvents: jest.fn(async () => {
        throw new Error('db down');
      }),
      countByName: jest.fn(async () => 0),
      countDistinctUsers: jest.fn(async () => 0),
      countByNameForUser: jest.fn(async () => 0),
      lastEventAt: jest.fn(async () => null),
      groupPaywallShownByVariantAndSurface: jest.fn(async () => []),
      groupPaywallClicksByVariant: jest.fn(async () => []),
      groupUploadFunnel: jest.fn(async () => []),
      groupUploadFunnelByOrigin: jest.fn(async () => []),
      groupConversionFailedByReason: jest.fn(async () => ({
        paywall: 0,
        empty: 0,
        technical: 0,
      })),
    };
    const sink = new EventsSink(repo, { flushThreshold: 1 });
    sink.record(baseRow);
    await expect(sink.waitForPendingFlush()).resolves.toBeUndefined();
  });

  it('start is idempotent', () => {
    const { repo } = makeFakeRepository();
    const sink = new EventsSink(repo, { flushIntervalMs: 1000 });
    sink.start();
    sink.start();
    sink.stop();
  });
});
