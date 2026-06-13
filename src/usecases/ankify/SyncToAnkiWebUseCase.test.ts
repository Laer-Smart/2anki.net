import { AnkifyClientsRepositoryInterface } from '../../data_layer/ankify/AnkifyClientsRepository';
import {
  AnkiConnectClient,
  AnkiConnectUnreachableError,
} from '../../services/ankify/AnkiConnectClient';
import {
  NoActiveAnkifyClientForSyncError,
  SyncToAnkiWebUseCase,
} from './SyncToAnkiWebUseCase';

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

describe('SyncToAnkiWebUseCase', () => {
  test('triggers a sync on the active client', async () => {
    const ping = jest.fn(async () => 6);
    const sync = jest.fn(async () => null);
    const factory = jest.fn(
      () => ({ ping, sync }) as unknown as AnkiConnectClient
    );
    const useCase = new SyncToAnkiWebUseCase(
      clientsRepo(activeClient),
      factory
    );

    await useCase.execute(42);

    expect(ping).toHaveBeenCalledTimes(1);
    expect(sync).toHaveBeenCalledTimes(1);
  });

  test('throws when there is no active client', async () => {
    const useCase = new SyncToAnkiWebUseCase(clientsRepo(null), jest.fn());

    await expect(useCase.execute(42)).rejects.toBeInstanceOf(
      NoActiveAnkifyClientForSyncError
    );
  });

  test('propagates AnkiConnectUnreachableError', async () => {
    const ping = jest.fn(async () => {
      throw new AnkiConnectUnreachableError('http://x', new Error('down'));
    });
    const factory = jest.fn(() => ({ ping }) as unknown as AnkiConnectClient);
    const useCase = new SyncToAnkiWebUseCase(
      clientsRepo(activeClient),
      factory
    );

    await expect(useCase.execute(42)).rejects.toBeInstanceOf(
      AnkiConnectUnreachableError
    );
  });
});
