import { AnkifyClientsRepositoryInterface } from '../../data_layer/ankify/AnkifyClientsRepository';
import { AnkiConnectClient } from '../../services/ankify/AnkiConnectClient';
import { GetReviewQueueUseCase } from './GetReviewQueueUseCase';

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

describe('GetReviewQueueUseCase', () => {
  it('returns due cards for a deck the user never synced from Notion', async () => {
    const findCards = jest.fn(async () => [9001]);
    const cardsInfo = jest.fn(async () => [
      {
        cardId: 9001,
        note: 5,
        deckName: 'My Own Deck',
        lapses: 0,
        queue: 2,
        question: '<p>Q1</p>',
        answer: '<p>A1</p>',
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
      factory
    );

    const result = await useCase.execute({ owner: 42, deck: 'My Own Deck' });

    expect(findCards).toHaveBeenCalledWith('"deck:My Own Deck" is:due');
    expect(result).toEqual({
      connected: true,
      cards: [
        {
          cardId: 9001,
          questionHtml: '<p>Q1</p>',
          answerHtml: '<p>A1</p>',
          css: '.card { color: black; }',
        },
      ],
    });
  });

  it('returns connected:false with no cards when no active client', async () => {
    const useCase = new GetReviewQueueUseCase(clientsRepo(null), jest.fn());

    const result = await useCase.execute({
      owner: 42,
      deck: 'Notion Sync::Pharma',
    });

    expect(result).toEqual({ connected: false, cards: [] });
  });

  it('scopes findCards to the escaped deck with is:due and maps card info', async () => {
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
      factory
    );

    const result = await useCase.execute({
      owner: 42,
      deck: 'Notion Sync::Pharma',
    });

    expect(result).toEqual({ connected: true, cards: [] });
    expect(cardsInfo).not.toHaveBeenCalled();
  });

  it('escapes quotes and backslashes in the deck name', async () => {
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
      factory
    );

    await useCase.execute({ owner: 42, deck: 'Week "18"\\x' });

    expect(findCards).toHaveBeenCalledWith('"deck:Week \\"18\\"\\\\x" is:due');
  });
});
