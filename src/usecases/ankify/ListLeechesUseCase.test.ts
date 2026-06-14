import { AnkifyClientsRepositoryInterface } from '../../data_layer/ankify/AnkifyClientsRepository';
import { AnkifyNotionSubscriptionsRepositoryInterface } from '../../data_layer/ankify/AnkifyNotionSubscriptionsRepository';
import {
  AnkiConnectClient,
  AnkiConnectUnreachableError,
} from '../../services/ankify/AnkiConnectClient';
import { ListLeechesUseCase } from './ListLeechesUseCase';

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

describe('ListLeechesUseCase', () => {
  test('returns connected:false when there is no active client', async () => {
    const useCase = new ListLeechesUseCase(
      clientsRepo(null),
      subsRepo([{ target_deck: 'MS3::Pharma', notion_page_title: null }]),
      jest.fn()
    );

    expect(await useCase.execute({ owner: 42 })).toEqual({ connected: false });
  });

  test('returns an empty list without touching AnkiConnect when no decks are owned', async () => {
    const factory = jest.fn();
    const useCase = new ListLeechesUseCase(
      clientsRepo(activeClient),
      subsRepo([]),
      factory
    );

    expect(await useCase.execute({ owner: 42 })).toEqual({
      connected: true,
      leeches: [],
    });
    expect(factory).not.toHaveBeenCalled();
  });

  test('maps notes to LeechNote shape sorted most-lapses-first', async () => {
    const findNotes = jest.fn(async () => [7001, 7002]);
    const notesInfo = jest.fn(async () => [
      {
        noteId: 7001,
        modelName: 'Basic',
        tags: ['leech'],
        fields: {
          Front: { value: 'A front', order: 0 },
          Back: { value: 'A back', order: 1 },
        },
        cards: [11],
      },
      {
        noteId: 7002,
        modelName: 'Basic',
        tags: ['leech', 'pharma'],
        fields: {
          Front: { value: 'B front', order: 0 },
          Back: { value: 'B back', order: 1 },
        },
        cards: [22],
      },
    ]);
    const cardsInfo = jest.fn(async () => [
      {
        cardId: 11,
        note: 7001,
        deckName: 'Notion Sync::Pharma',
        lapses: 8,
        queue: -1,
      },
      {
        cardId: 22,
        note: 7002,
        deckName: 'Notion Sync::Pharma',
        lapses: 12,
        queue: -1,
      },
    ]);
    const factory = jest.fn(
      () =>
        ({
          ping: jest.fn(async () => 6),
          findNotes,
          notesInfo,
          cardsInfo,
        }) as unknown as AnkiConnectClient
    );
    const useCase = new ListLeechesUseCase(
      clientsRepo(activeClient),
      subsRepo([
        { target_deck: 'Notion Sync::Pharma', notion_page_title: null },
      ]),
      factory
    );

    const result = await useCase.execute({ owner: 42 });

    expect(findNotes).toHaveBeenCalledWith(
      'tag:leech ("deck:Notion Sync::Pharma")'
    );
    expect(result).toEqual({
      connected: true,
      leeches: [
        {
          noteId: 7002,
          deckName: 'Notion Sync::Pharma',
          modelName: 'Basic',
          fields: [
            { name: 'Front', value: 'B front' },
            { name: 'Back', value: 'B back' },
          ],
          tags: ['leech', 'pharma'],
          lapses: 12,
          suspended: true,
        },
        {
          noteId: 7001,
          deckName: 'Notion Sync::Pharma',
          modelName: 'Basic',
          fields: [
            { name: 'Front', value: 'A front' },
            { name: 'Back', value: 'A back' },
          ],
          tags: ['leech'],
          lapses: 8,
          suspended: true,
        },
      ],
    });
  });

  test('returns an empty list when no leech notes match', async () => {
    const findNotes = jest.fn(async () => []);
    const factory = jest.fn(
      () =>
        ({
          ping: jest.fn(async () => 6),
          findNotes,
          notesInfo: jest.fn(),
          cardsInfo: jest.fn(),
        }) as unknown as AnkiConnectClient
    );
    const useCase = new ListLeechesUseCase(
      clientsRepo(activeClient),
      subsRepo([
        { target_deck: 'Notion Sync::Pharma', notion_page_title: null },
      ]),
      factory
    );

    expect(await useCase.execute({ owner: 42 })).toEqual({
      connected: true,
      leeches: [],
    });
  });

  test('propagates AnkiConnectUnreachableError from the ping', async () => {
    const factory = jest.fn(
      () =>
        ({
          ping: jest.fn(async () => {
            throw new AnkiConnectUnreachableError(
              'http://x',
              new Error('down')
            );
          }),
          findNotes: jest.fn(),
          notesInfo: jest.fn(),
          cardsInfo: jest.fn(),
        }) as unknown as AnkiConnectClient
    );
    const useCase = new ListLeechesUseCase(
      clientsRepo(activeClient),
      subsRepo([
        { target_deck: 'Notion Sync::Pharma', notion_page_title: null },
      ]),
      factory
    );

    await expect(useCase.execute({ owner: 42 })).rejects.toBeInstanceOf(
      AnkiConnectUnreachableError
    );
  });
});
