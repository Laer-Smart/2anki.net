import { GetAnkifyStatsUseCase } from './GetAnkifyStatsUseCase';
import { AnkifyClientsRepositoryInterface } from '../../data_layer/ankify/AnkifyClientsRepository';
import { AnkifySyncMappingsRepositoryInterface } from '../../data_layer/ankify/AnkifySyncMappingsRepository';
import {
  AnkiConnectUnreachableError,
  AnkiDeckStat,
} from '../../services/ankify/AnkiConnectClient';
import { AnkifyClient } from '../../entities/ankify';

const activeClient = {
  id: 7,
  anki_port: 8765,
  anki_connect_api_key: null,
} as unknown as AnkifyClient;

const makeClientsRepo = (
  client: AnkifyClient | null
): AnkifyClientsRepositoryInterface =>
  ({
    findActiveByOwner: jest.fn(async () => client),
  }) as unknown as AnkifyClientsRepositoryInterface;

const makeMappingsRepo = (
  deckNames: string[]
): AnkifySyncMappingsRepositoryInterface =>
  ({
    listByClient: jest.fn(async () =>
      deckNames.map((deck_name, i) => ({
        deck_name,
        anki_note_id: i,
      }))
    ),
  }) as unknown as AnkifySyncMappingsRepositoryInterface;

const TODAY = '2026-06-12';

interface FakeAnkiConnect {
  ping: jest.Mock;
  getNumCardsReviewedToday: jest.Mock;
  getNumCardsReviewedByDay: jest.Mock;
  getDeckStats: jest.Mock;
  cardReviews: jest.Mock;
  getReviewMinutesByDay: jest.Mock;
}

const makeAnkiConnect = (
  overrides: Partial<Record<keyof FakeAnkiConnect, jest.Mock>> = {}
): FakeAnkiConnect => ({
  ping: jest.fn(async () => 6),
  getNumCardsReviewedToday: jest.fn(async () => 0),
  getNumCardsReviewedByDay: jest.fn(async () => [] as Array<[string, number]>),
  getDeckStats: jest.fn(async () => ({}) as Record<string, AnkiDeckStat>),
  cardReviews: jest.fn(async () => []),
  getReviewMinutesByDay: jest.fn(async () => new Map()),
  ...overrides,
});

describe('GetAnkifyStatsUseCase', () => {
  test('returns connected:false when there is no active client', async () => {
    const ac = makeAnkiConnect();
    const useCase = new GetAnkifyStatsUseCase(
      makeClientsRepo(null),
      makeMappingsRepo([]),
      () => ac as never
    );

    const result = await useCase.execute(1, { today: TODAY });

    expect(result).toEqual({ connected: false });
    expect(ac.getNumCardsReviewedToday).not.toHaveBeenCalled();
  });

  test('returns connected:false when the client is unreachable', async () => {
    const ac = makeAnkiConnect({
      ping: jest.fn(async () => {
        throw new AnkiConnectUnreachableError('http://x', new Error('down'));
      }),
    });
    const useCase = new GetAnkifyStatsUseCase(
      makeClientsRepo(activeClient),
      makeMappingsRepo(['Pharmacology']),
      () => ac as never
    );

    const result = await useCase.execute(1, { today: TODAY });

    expect(result).toEqual({ connected: false });
    expect(ac.getNumCardsReviewedToday).not.toHaveBeenCalled();
    expect(ac.getDeckStats).not.toHaveBeenCalled();
  });

  test('skips getDeckStats when there are no synced decks', async () => {
    const ac = makeAnkiConnect({
      getNumCardsReviewedToday: jest.fn(async () => 4),
      getNumCardsReviewedByDay: jest.fn(async () => [['2026-06-12', 4]]),
    });
    const useCase = new GetAnkifyStatsUseCase(
      makeClientsRepo(activeClient),
      makeMappingsRepo([]),
      () => ac as never
    );

    const result = await useCase.execute(1, { today: TODAY });

    expect(ac.getDeckStats).not.toHaveBeenCalled();
    expect(result).toEqual({
      connected: true,
      reviewedToday: 4,
      reviewedThisYear: 4,
      currentStreak: 1,
      longestStreak: 1,
      reviewsByDay: [{ date: '2026-06-12', count: 4 }],
      decks: [],
    });
  });

  test('maps the happy path into a typed response and never invokes the fan-out reads', async () => {
    const ac = makeAnkiConnect({
      getNumCardsReviewedToday: jest.fn(async () => 12),
      getNumCardsReviewedByDay: jest.fn(async () => [
        ['2026-06-12', 12],
        ['2026-06-11', 8],
      ]),
      getDeckStats: jest.fn(async () => ({
        '111': {
          deck_id: 111,
          name: 'Pharmacology',
          new_count: 5,
          learn_count: 2,
          review_count: 11,
          total_in_deck: 120,
        },
      })),
    });
    const useCase = new GetAnkifyStatsUseCase(
      makeClientsRepo(activeClient),
      makeMappingsRepo(['Pharmacology', 'Pharmacology']),
      () => ac as never
    );

    const result = await useCase.execute(1, { today: TODAY });

    expect(ac.getDeckStats).toHaveBeenCalledWith(['Pharmacology']);
    expect(ac.cardReviews).not.toHaveBeenCalled();
    expect(ac.getReviewMinutesByDay).not.toHaveBeenCalled();
    expect(result).toEqual({
      connected: true,
      reviewedToday: 12,
      reviewedThisYear: 20,
      currentStreak: 2,
      longestStreak: 2,
      reviewsByDay: [
        { date: '2026-06-12', count: 12 },
        { date: '2026-06-11', count: 8 },
      ],
      decks: [
        {
          name: 'Pharmacology',
          new: 5,
          learning: 2,
          review: 11,
          total: 120,
        },
      ],
    });
  });
});
