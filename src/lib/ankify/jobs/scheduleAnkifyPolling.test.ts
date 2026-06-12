import { scheduleAnkifyPolling } from './scheduleAnkifyPolling';
import { AnkifyNotionSubscriptionsRepositoryInterface } from '../../../data_layer/ankify/AnkifyNotionSubscriptionsRepository';
import { SyncNotionPageToRacUseCase } from '../../../usecases/ankify/SyncNotionPageToRacUseCase';
import { AnkifyNotionSubscription } from '../../../entities/ankify';

const sampleSubscription = (
  overrides: Partial<AnkifyNotionSubscription> = {}
): AnkifyNotionSubscription => ({
  id: 1,
  owner: 42,
  ankify_client_id: 1,
  notion_page_id: 'page-id',
  notion_page_title: null,
  notion_page_url: null,
  notion_page_icon: null,
  target_deck: null,
  enabled: true,
  last_polled_at: null,
  last_synced_at: null,
  last_error: null,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

const makeSubscriptions =
  (): jest.Mocked<AnkifyNotionSubscriptionsRepositoryInterface> =>
    ({
      upsert: jest.fn(),
      listByOwner: jest.fn(),
      listEnabled: jest.fn(),
      findByPageId: jest.fn(),
      findByOwnerAndPageId: jest.fn(),
      findById: jest.fn(),
      setEnabled: jest.fn(),
      deleteById: jest.fn(),
      recordPoll: jest.fn(),
      recordObjectType: jest.fn(),
    }) as unknown as jest.Mocked<AnkifyNotionSubscriptionsRepositoryInterface>;

const makeUseCase = (): jest.Mocked<
  Pick<SyncNotionPageToRacUseCase, 'execute'>
> =>
  ({
    execute: jest.fn(async () => undefined),
  }) as unknown as jest.Mocked<Pick<SyncNotionPageToRacUseCase, 'execute'>>;

const waitForTick = () => new Promise((resolve) => setTimeout(resolve, 30));

describe('scheduleAnkifyPolling', () => {
  test('skips a subscription deleted after the enabled snapshot was taken', async () => {
    const subscriptions = makeSubscriptions();
    const useCase = makeUseCase();

    const sub = sampleSubscription({ id: 7, notion_page_id: 'deleted-page' });
    subscriptions.listEnabled.mockResolvedValue([sub]);
    subscriptions.findByOwnerAndPageId.mockResolvedValue(null);

    const timer = scheduleAnkifyPolling(
      subscriptions,
      useCase as unknown as SyncNotionPageToRacUseCase,
      { intervalMs: 5 }
    );

    await waitForTick();

    expect(subscriptions.findByOwnerAndPageId).toHaveBeenCalledWith(
      42,
      'deleted-page'
    );
    expect(useCase.execute).not.toHaveBeenCalled();

    clearInterval(timer);
  });

  test('syncs a subscription that still exists when the tick runs', async () => {
    const subscriptions = makeSubscriptions();
    const useCase = makeUseCase();

    const sub = sampleSubscription({ id: 8, notion_page_id: 'live-page' });
    subscriptions.listEnabled.mockResolvedValue([sub]);
    subscriptions.findByOwnerAndPageId.mockResolvedValue(sub);

    const timer = scheduleAnkifyPolling(
      subscriptions,
      useCase as unknown as SyncNotionPageToRacUseCase,
      { intervalMs: 5 }
    );

    await waitForTick();

    expect(useCase.execute).toHaveBeenCalledWith({
      owner: 42,
      notionPageId: 'live-page',
      knownObjectType: null,
      trigger: 'polling',
    });

    clearInterval(timer);
  });

  test('passes the remembered object type so the sync can skip the doomed page lookup', async () => {
    const subscriptions = makeSubscriptions();
    const useCase = makeUseCase();

    const sub = sampleSubscription({
      id: 9,
      notion_page_id: 'database-page',
      notion_object_type: 'database',
    });
    subscriptions.listEnabled.mockResolvedValue([sub]);
    subscriptions.findByOwnerAndPageId.mockResolvedValue(sub);

    const timer = scheduleAnkifyPolling(
      subscriptions,
      useCase as unknown as SyncNotionPageToRacUseCase,
      { intervalMs: 5 }
    );

    await waitForTick();

    expect(useCase.execute).toHaveBeenCalledWith({
      owner: 42,
      notionPageId: 'database-page',
      knownObjectType: 'database',
      trigger: 'polling',
    });

    clearInterval(timer);
  });
});
