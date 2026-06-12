import { GetAnkifyStatsUseCase } from './GetAnkifyStatsUseCase';
import { AnkifyClientsRepositoryInterface } from '../../data_layer/ankify/AnkifyClientsRepository';
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

const TODAY = '2026-06-12';

interface FakeAnkiConnect {
  ping: jest.Mock;
  deckNames: jest.Mock;
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
  deckNames: jest.fn(async () => [] as string[]),
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
      () => ac as never
    );

    const result = await useCase.execute(1, { today: TODAY });

    expect(result).toEqual({ connected: false });
    expect(ac.getNumCardsReviewedToday).not.toHaveBeenCalled();
    expect(ac.getDeckStats).not.toHaveBeenCalled();
  });

  test('skips getDeckStats when the collection has no decks', async () => {
    const ac = makeAnkiConnect({
      deckNames: jest.fn(async () => []),
      getNumCardsReviewedToday: jest.fn(async () => 4),
      getNumCardsReviewedByDay: jest.fn(async () => [['2026-06-12', 4]]),
    });
    const useCase = new GetAnkifyStatsUseCase(
      makeClientsRepo(activeClient),
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

  test('fetches deck stats for the full collection and sorts decks by total desc', async () => {
    const ac = makeAnkiConnect({
      deckNames: jest.fn(async () => [
        'Default',
        'Pharmacology',
        'Spanish::Verbs',
      ]),
      getNumCardsReviewedToday: jest.fn(async () => 12),
      getNumCardsReviewedByDay: jest.fn(async () => [
        ['2026-06-12', 12],
        ['2026-06-11', 8],
      ]),
      getDeckStats: jest.fn(async () => ({
        '1': {
          deck_id: 1,
          name: 'Default',
          new_count: 0,
          learn_count: 0,
          review_count: 0,
          total_in_deck: 0,
        },
        '111': {
          deck_id: 111,
          name: 'Pharmacology',
          new_count: 5,
          learn_count: 2,
          review_count: 11,
          total_in_deck: 120,
        },
        '222': {
          deck_id: 222,
          name: 'Spanish::Verbs',
          new_count: 1,
          learn_count: 0,
          review_count: 4,
          total_in_deck: 300,
        },
      })),
    });
    const useCase = new GetAnkifyStatsUseCase(
      makeClientsRepo(activeClient),
      () => ac as never
    );

    const result = await useCase.execute(1, { today: TODAY });

    expect(ac.deckNames).toHaveBeenCalledTimes(1);
    expect(ac.getDeckStats).toHaveBeenCalledWith([
      'Default',
      'Pharmacology',
      'Spanish::Verbs',
    ]);
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
        { name: 'Spanish::Verbs', new: 1, learning: 0, review: 4, total: 300 },
        { name: 'Pharmacology', new: 5, learning: 2, review: 11, total: 120 },
        { name: 'Default', new: 0, learning: 0, review: 0, total: 0 },
      ],
    });
  });

  test('tie-breaks decks with equal totals by name ascending', async () => {
    const ac = makeAnkiConnect({
      deckNames: jest.fn(async () => ['Zoology', 'Anatomy']),
      getDeckStats: jest.fn(async () => ({
        '1': {
          deck_id: 1,
          name: 'Zoology',
          new_count: 0,
          learn_count: 0,
          review_count: 0,
          total_in_deck: 50,
        },
        '2': {
          deck_id: 2,
          name: 'Anatomy',
          new_count: 0,
          learn_count: 0,
          review_count: 0,
          total_in_deck: 50,
        },
      })),
    });
    const useCase = new GetAnkifyStatsUseCase(
      makeClientsRepo(activeClient),
      () => ac as never
    );

    const result = await useCase.execute(1, { today: TODAY });

    expect(result).toMatchObject({
      connected: true,
      decks: [
        { name: 'Anatomy', total: 50 },
        { name: 'Zoology', total: 50 },
      ],
    });
  });
});
