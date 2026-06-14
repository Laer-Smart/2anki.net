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
  it('returns the due card ids for a deck the user never synced from Notion', async () => {
    const findCards = jest.fn(async () => [9001, 9002]);
    const cardsInfo = jest.fn();
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
    expect(result).toEqual({ connected: true, cardIds: [9001, 9002] });
    expect(cardsInfo).not.toHaveBeenCalled();
  });

  it('returns connected:false when no active client', async () => {
    const useCase = new GetReviewQueueUseCase(clientsRepo(null), jest.fn());

    const result = await useCase.execute({
      owner: 42,
      deck: 'Notion Sync::Pharma',
    });

    expect(result).toEqual({ connected: false });
  });

  it('returns an empty card id list when no cards are due', async () => {
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

    const result = await useCase.execute({
      owner: 42,
      deck: 'Notion Sync::Pharma',
    });

    expect(result).toEqual({ connected: true, cardIds: [] });
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
