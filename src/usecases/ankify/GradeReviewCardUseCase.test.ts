import { AnkifyClientsRepositoryInterface } from '../../data_layer/ankify/AnkifyClientsRepository';
import { AnkifyNotionSubscriptionsRepositoryInterface } from '../../data_layer/ankify/AnkifyNotionSubscriptionsRepository';
import { AnkiConnectClient } from '../../services/ankify/AnkiConnectClient';
import {
  GradeReviewCardUseCase,
  InvalidReviewEaseError,
  NoActiveAnkifyClientForReviewError,
} from './GradeReviewCardUseCase';
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

describe('GradeReviewCardUseCase', () => {
  it.each([0, 5, 1.5, '3', NaN])(
    'rejects ease %p with InvalidReviewEaseError and never calls AnkiConnect',
    async (ease) => {
      const findActiveByOwner = jest.fn();
      const factory = jest.fn();
      const useCase = new GradeReviewCardUseCase(
        {
          findActiveByOwner,
        } as unknown as AnkifyClientsRepositoryInterface,
        ownedSubs,
        factory
      );

      await expect(
        useCase.execute({
          owner: 42,
          cardId: 9001,
          ease: ease as unknown as number,
        })
      ).rejects.toBeInstanceOf(InvalidReviewEaseError);
      expect(findActiveByOwner).not.toHaveBeenCalled();
      expect(factory).not.toHaveBeenCalled();
    }
  );

  it('grades the card after the cid ownership check passes', async () => {
    const findCards = jest.fn(async () => [9001]);
    const answerCards = jest.fn(async () => [true]);
    const factory = jest.fn(
      () =>
        ({
          ping: jest.fn(async () => 6),
          findCards,
          answerCards,
        }) as unknown as AnkiConnectClient
    );
    const useCase = new GradeReviewCardUseCase(
      clientsRepo(activeClient),
      ownedSubs,
      factory
    );

    const result = await useCase.execute({ owner: 42, cardId: 9001, ease: 3 });

    expect(result).toEqual({ graded: true });
    expect(findCards).toHaveBeenCalledWith(
      'cid:9001 ("deck:Notion Sync::Pharma")'
    );
    expect(answerCards).toHaveBeenCalledWith([{ cardId: 9001, ease: 3 }]);
  });

  it('rejects a forged cardId not in an owned deck and never grades', async () => {
    const findCards = jest.fn(async () => []);
    const answerCards = jest.fn(async () => [true]);
    const factory = jest.fn(
      () =>
        ({
          ping: jest.fn(async () => 6),
          findCards,
          answerCards,
        }) as unknown as AnkiConnectClient
    );
    const useCase = new GradeReviewCardUseCase(
      clientsRepo(activeClient),
      ownedSubs,
      factory
    );

    await expect(
      useCase.execute({ owner: 42, cardId: 1234567, ease: 4 })
    ).rejects.toBeInstanceOf(DeckNotOwnedError);
    expect(answerCards).not.toHaveBeenCalled();
  });

  it('throws when there is no active client (offline)', async () => {
    const useCase = new GradeReviewCardUseCase(
      clientsRepo(null),
      ownedSubs,
      jest.fn()
    );

    await expect(
      useCase.execute({ owner: 42, cardId: 9001, ease: 3 })
    ).rejects.toBeInstanceOf(NoActiveAnkifyClientForReviewError);
  });

  it('builds a cid: ownership query scoped to the owned :: hierarchy', async () => {
    const findCards = jest.fn(async () => [9001]);
    const answerCards = jest.fn(async () => [true]);
    const factory = jest.fn(
      () =>
        ({
          ping: jest.fn(async () => 6),
          findCards,
          answerCards,
        }) as unknown as AnkiConnectClient
    );
    const useCase = new GradeReviewCardUseCase(
      clientsRepo(activeClient),
      subsRepo([
        {
          target_deck: 'MS3::Pharma::Sub',
          notion_page_title: null,
        },
      ]),
      factory
    );

    await useCase.execute({ owner: 42, cardId: 9001, ease: 2 });

    expect(findCards).toHaveBeenCalledWith(
      'cid:9001 ("deck:MS3::Pharma::Sub")'
    );
  });
});
