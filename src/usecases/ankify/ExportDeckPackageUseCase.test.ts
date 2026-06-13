import { AnkifyClient } from '../../entities/ankify';
import { AnkifyClientsRepositoryInterface } from '../../data_layer/ankify/AnkifyClientsRepository';
import { AnkifyNotionSubscriptionsRepositoryInterface } from '../../data_layer/ankify/AnkifyNotionSubscriptionsRepository';
import {
  AnkiConnectClient,
  AnkiConnectUnreachableError,
} from '../../services/ankify/AnkiConnectClient';
import {
  DeckExportFailedError,
  ExportDeckPackageUseCase,
  ExportedDeckBytesReader,
  NoActiveAnkifyClientForExportError,
} from './ExportDeckPackageUseCase';
import { DeckNotOwnedError } from './OpenDeckInAnkiUseCase';

const activeClient = {
  id: 1,
  owner: 42,
  anki_port: 8765,
  anki_connect_api_key: 'k',
  container_id: 'cid',
} as unknown as AnkifyClient;

const clientsRepo = (
  client: AnkifyClient | null
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

const owned = [{ target_deck: 'MS3::Pharma', notion_page_title: null }];

describe('ExportDeckPackageUseCase', () => {
  test('exports to a server-generated container path and returns the bytes', async () => {
    const bytes = Buffer.from('apkg-bytes');
    const exportPackage = jest.fn(
      async (_deck: string, _path: string, _sched: boolean) => true
    );
    const factory = jest.fn(
      () =>
        ({
          ping: jest.fn(async () => 6),
          exportPackage,
        }) as unknown as AnkiConnectClient
    );
    const cleanup = jest.fn(async () => undefined);
    const reader: ExportedDeckBytesReader = jest.fn(async () => ({
      bytes,
      cleanup,
    }));

    const useCase = new ExportDeckPackageUseCase(
      clientsRepo(activeClient),
      subsRepo(owned),
      factory,
      reader
    );

    const result = await useCase.execute({ owner: 42, deck: 'MS3::Pharma' });

    expect(result.bytes).toBe(bytes);
    expect(result.deck).toBe('MS3::Pharma');
    const [deckArg, pathArg, schedArg] = exportPackage.mock.calls[0];
    expect(deckArg).toBe('MS3::Pharma');
    expect(pathArg).toMatch(/^\/data\/[0-9a-f-]{36}\.apkg$/);
    expect(schedArg).toBe(false);
    expect(reader).toHaveBeenCalledWith(activeClient, pathArg);
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  test('never accepts a client-supplied path', async () => {
    const exportPackage = jest.fn(
      async (_deck: string, _path: string, _sched: boolean) => true
    );
    const factory = jest.fn(
      () =>
        ({
          ping: jest.fn(async () => 6),
          exportPackage,
        }) as unknown as AnkiConnectClient
    );
    const useCase = new ExportDeckPackageUseCase(
      clientsRepo(activeClient),
      subsRepo(owned),
      factory,
      jest.fn(async () => ({
        bytes: Buffer.from(''),
        cleanup: jest.fn(async () => undefined),
      }))
    );

    await useCase.execute({
      owner: 42,
      deck: 'MS3::Pharma',
      ...({ path: '/etc/passwd' } as unknown as object),
    });

    expect(exportPackage.mock.calls[0][1]).not.toContain('passwd');
  });

  test('rejects a deck the user does not own before any AnkiConnect call', async () => {
    const factory = jest.fn();
    const useCase = new ExportDeckPackageUseCase(
      clientsRepo(activeClient),
      subsRepo(owned),
      factory,
      jest.fn()
    );

    await expect(
      useCase.execute({ owner: 42, deck: 'Default' })
    ).rejects.toBeInstanceOf(DeckNotOwnedError);
    expect(factory).not.toHaveBeenCalled();
  });

  test('throws when there is no active client', async () => {
    const useCase = new ExportDeckPackageUseCase(
      clientsRepo(null),
      subsRepo(owned),
      jest.fn(),
      jest.fn()
    );

    await expect(
      useCase.execute({ owner: 42, deck: 'MS3::Pharma' })
    ).rejects.toBeInstanceOf(NoActiveAnkifyClientForExportError);
  });

  test('throws DeckExportFailedError when Anki reports failure', async () => {
    const factory = jest.fn(
      () =>
        ({
          ping: jest.fn(async () => 6),
          exportPackage: jest.fn(async () => false),
        }) as unknown as AnkiConnectClient
    );
    const reader = jest.fn();
    const useCase = new ExportDeckPackageUseCase(
      clientsRepo(activeClient),
      subsRepo(owned),
      factory,
      reader as unknown as ExportedDeckBytesReader
    );

    await expect(
      useCase.execute({ owner: 42, deck: 'MS3::Pharma' })
    ).rejects.toBeInstanceOf(DeckExportFailedError);
    expect(reader).not.toHaveBeenCalled();
  });

  test('propagates AnkiConnectUnreachableError from ping', async () => {
    const factory = jest.fn(
      () =>
        ({
          ping: jest.fn(async () => {
            throw new AnkiConnectUnreachableError(
              'http://x',
              new Error('down')
            );
          }),
        }) as unknown as AnkiConnectClient
    );
    const useCase = new ExportDeckPackageUseCase(
      clientsRepo(activeClient),
      subsRepo(owned),
      factory,
      jest.fn()
    );

    await expect(
      useCase.execute({ owner: 42, deck: 'MS3::Pharma' })
    ).rejects.toBeInstanceOf(AnkiConnectUnreachableError);
  });
});
