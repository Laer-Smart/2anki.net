import { AnkifyClientsRepositoryInterface } from '../../data_layer/ankify/AnkifyClientsRepository';
import {
  AnkiConnectClient,
  AnkiConnectUnreachableError,
} from '../../services/ankify/AnkiConnectClient';
import {
  COLLECTION_STATS_HTML_MAX_BYTES,
  GetCollectionStatsHtmlUseCase,
} from './GetCollectionStatsHtmlUseCase';

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

describe('GetCollectionStatsHtmlUseCase', () => {
  test('returns the native stats HTML when connected', async () => {
    const ping = jest.fn(async () => 6);
    const getCollectionStatsHTML = jest.fn(async () => '<div>stats</div>');
    const factory = jest.fn(
      () => ({ ping, getCollectionStatsHTML }) as unknown as AnkiConnectClient
    );
    const useCase = new GetCollectionStatsHtmlUseCase(
      clientsRepo(activeClient),
      factory
    );

    const result = await useCase.execute(42);

    expect(result).toEqual({
      connected: true,
      html: '<div>stats</div>',
      truncated: false,
    });
    expect(getCollectionStatsHTML).toHaveBeenCalledWith(true);
  });

  test('caps the HTML and flags truncation when over the byte budget', async () => {
    const oversized = 'a'.repeat(COLLECTION_STATS_HTML_MAX_BYTES + 100);
    const factory = jest.fn(
      () =>
        ({
          ping: jest.fn(async () => 6),
          getCollectionStatsHTML: jest.fn(async () => oversized),
        }) as unknown as AnkiConnectClient
    );
    const useCase = new GetCollectionStatsHtmlUseCase(
      clientsRepo(activeClient),
      factory
    );

    const result = await useCase.execute(42);

    expect(result).toEqual({
      connected: true,
      html: 'a'.repeat(COLLECTION_STATS_HTML_MAX_BYTES),
      truncated: true,
    });
  });

  test('returns connected false when there is no active client', async () => {
    const useCase = new GetCollectionStatsHtmlUseCase(
      clientsRepo(null),
      jest.fn()
    );

    expect(await useCase.execute(42)).toEqual({ connected: false });
  });

  test('returns connected false when AnkiConnect is unreachable', async () => {
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
    const useCase = new GetCollectionStatsHtmlUseCase(
      clientsRepo(activeClient),
      factory
    );

    expect(await useCase.execute(42)).toEqual({ connected: false });
  });
});
