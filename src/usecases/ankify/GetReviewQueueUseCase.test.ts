import { AnkifyClientsRepositoryInterface } from '../../data_layer/ankify/AnkifyClientsRepository';
import { AnkifyNotionSubscriptionsRepositoryInterface } from '../../data_layer/ankify/AnkifyNotionSubscriptionsRepository';
import { AnkiConnectClient } from '../../services/ankify/AnkiConnectClient';
import { GetReviewQueueUseCase } from './GetReviewQueueUseCase';
import { DeckNotOwnedError } from './OpenDeckInAnkiUseCase';

const activeClient = {
  id: 1,
  owner: 42,
  anki_port: 8765,
  anki_connect_api_key: 'k',
} as unknown as Awaited<
  ReturnType<AnkifyClientsRepositoryInterface['findActiveByOwner']>
>;

const clientsRepo = (
  client: Awaited<
    ReturnType<AnkifyClientsRepositoryInterface['findActiveByOwner']>
  >
): AnkifyClientsRepositoryInterface =>
  ({
    findActiveByOwner: jest.fn(async () => client),
  }) as unknown as AnkifyClientsRepositoryInterface;

const subsRepo = (
  rows: { target_deck: string | null; notion_page_title: string | null }[]
): AnkifyNotionSubscriptionsRepositoryInterface =>
  ({
    listByOwner: jest.fn(async () => rows),
  }) as unknown as AnkifyNotionSubscriptionsRepositoryInterface;

const ownedSubs = subsRepo([
  { target_deck: 'Notion Sync::Pharma', notion_page_title: null },
]);

describe('GetReviewQueueUseCase', () => {
  it('rejects a deck the user does not own', async () => {
    const factory = jest.fn();
    const useCase = new GetReviewQueueUseCase(
      clientsRepo(activeClient),
      subsRepo([
        { target_deck: 'Notion Sync::Torts', notion_page_title: null },
      ]),
      factory
    );

    await expect(
      useCase.execute({ owner: 42, deck: 'Notion Sync::Pharma' })
    ).rejects.toBeInstanceOf(DeckNotOwnedError);
    expect(factory).not.toHaveBeenCalled();
  });

  it('returns connected:false with no cards when no active client', async () => {
    const useCase = new GetReviewQueueUseCase(
      clientsRepo(null),
      ownedSubs,
      jest.fn()
    );

    const result = await useCase.execute({
      owner: 42,
      deck: 'Notion Sync::Pharma',
    });

    expect(result).toEqual({ connected: false, cards: [] });
  });

  it('scopes findCards to the escaped owned deck with is:due and maps card info', async () => {
    const findCards = jest.fn(async () => [9001, 9002]);
    const cardsInfo = jest.fn(async () => [
      {
        cardId: 9001,
        note: 5,
        deckName: 'Notion Sync::Pharma',
        lapses: 0,
        queue: 2,
        question: '<p>Q1</p>',
        answer: '<p>A1</p>',
        css: '.card { color: black; }',
      },
      {
        cardId: 9002,
        note: 6,
        deckName: 'Notion Sync::Pharma',
        lapses: 1,
        queue: 2,
        question: '<p>Q2</p>',
        answer: '<p>A2</p>',
        css: '.card { color: black; }',
      },
    ]);
    const factory = jest.fn(
      () =>
        ({
          ping: jest.fn(async () => 6),
          findCards,
          cardsInfo,
        }) as unknown as AnkiConnectClient
    );
    const useCase = new GetReviewQueueUseCase(
      clientsRepo(activeClient),
      ownedSubs,
      factory
    );

    const result = await useCase.execute({
      owner: 42,
      deck: 'Notion Sync::Pharma',
    });

    expect(findCards).toHaveBeenCalledWith('"deck:Notion Sync::Pharma" is:due');
    expect(result).toEqual({
      connected: true,
      cards: [
        {
          cardId: 9001,
          questionHtml: '<p>Q1</p>',
          answerHtml: '<p>A1</p>',
          css: '.card { color: black; }',
        },
        {
          cardId: 9002,
          questionHtml: '<p>Q2</p>',
          answerHtml: '<p>A2</p>',
          css: '.card { color: black; }',
        },
      ],
    });
  });

  it('returns an empty queue when no cards are due', async () => {
    const findCards = jest.fn(async () => []);
    const cardsInfo = jest.fn(async () => []);
    const factory = jest.fn(
      () =>
        ({
          ping: jest.fn(async () => 6),
          findCards,
          cardsInfo,
        }) as unknown as AnkiConnectClient
    );
    const useCase = new GetReviewQueueUseCase(
      clientsRepo(activeClient),
      ownedSubs,
      factory
    );

    const result = await useCase.execute({
      owner: 42,
      deck: 'Notion Sync::Pharma',
    });

    expect(result).toEqual({ connected: true, cards: [] });
    expect(cardsInfo).not.toHaveBeenCalled();
  });

  it('scopes the due query to a :: hierarchy deck', async () => {
    const findCards = jest.fn(async () => []);
    const factory = jest.fn(
      () =>
        ({
          ping: jest.fn(async () => 6),
          findCards,
          cardsInfo: jest.fn(),
        }) as unknown as AnkiConnectClient
    );
    const useCase = new GetReviewQueueUseCase(
      clientsRepo(activeClient),
      subsRepo([{ target_deck: 'MS3::Pharma', notion_page_title: null }]),
      factory
    );

    await useCase.execute({ owner: 42, deck: 'MS3::Pharma' });

    expect(findCards).toHaveBeenCalledWith('"deck:MS3::Pharma" is:due');
  });
});
