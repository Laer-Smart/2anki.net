import { SyncNotionPageToRacUseCase } from './SyncNotionPageToRacUseCase';
import {
  AnkifyClient,
  AnkifyNotionSubscription,
} from '../../entities/ankify';
import { AnkifyClientsRepositoryInterface } from '../../data_layer/ankify/AnkifyClientsRepository';
import { AnkifySyncMappingsRepositoryInterface } from '../../data_layer/ankify/AnkifySyncMappingsRepository';
import { AnkifySyncConflictsRepositoryInterface } from '../../data_layer/ankify/AnkifySyncConflictsRepository';
import { AnkifyNotionSubscriptionsRepositoryInterface } from '../../data_layer/ankify/AnkifyNotionSubscriptionsRepository';
import { AnkifySyncLogsRepositoryInterface } from '../../data_layer/ankify/AnkifySyncLogsRepository';
import { INotionRepository } from '../../data_layer/NotionRespository';
import { IErrorEventRepository } from '../../data_layer/ErrorEventRepository';
import { AnkiConnectClient } from '../../services/ankify/AnkiConnectClient';
import { WalkedNotionFlashcard } from '../../services/ankify/notionPageWalker';

jest.mock('../../services/ankify/notionPageWalker', () => ({
  walkNotionPageForFlashcards: jest.fn(),
}));

jest.mock('axios');

jest.mock('node:dns', () => ({
  promises: { lookup: jest.fn() },
}));

import axios from 'axios';
import dns from 'node:dns';
import { walkNotionPageForFlashcards } from '../../services/ankify/notionPageWalker';

const mockAxiosGet = axios.get as jest.Mock;
const mockDnsLookup = dns.promises.lookup as jest.Mock;

const sampleClient = (): AnkifyClient => ({
  id: 1,
  owner: 42,
  container_id: 'c',
  container_name: null,
  anki_port: 20000,
  vnc_port: 21000,
  novnc_port: 22000,
  anki_connect_api_key: null,
  status: 'active',
  created_at: new Date(),
  last_active_at: new Date(),
});

const sampleSubscription = (
  overrides: Partial<AnkifyNotionSubscription> = {}
): AnkifyNotionSubscription => ({
  id: 1,
  owner: 42,
  ankify_client_id: 1,
  notion_page_id: 'page-id',
  notion_page_title: null,
  notion_page_url: null,
  notion_page_icon: null,
  enabled: true,
  last_polled_at: null,
  last_synced_at: null,
  last_error: null,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

const sampleCard = (
  overrides: Partial<WalkedNotionFlashcard> = {}
): WalkedNotionFlashcard => ({
  notion_block_id: 'block-1',
  front: 'Front text',
  back: 'Back text',
  notion_last_edited_at: new Date(),
  media: [],
  ...overrides,
});

const makeClients = (): jest.Mocked<AnkifyClientsRepositoryInterface> =>
  ({
    create: jest.fn(),
    listByOwner: jest.fn(),
    findActiveById: jest.fn(),
    findActiveByOwner: jest.fn(async () => sampleClient()),
    setStatus: jest.fn(),
    touchLastActiveAt: jest.fn(),
    reservedPorts: jest.fn(),
    listIdleSince: jest.fn(),
  } as unknown as jest.Mocked<AnkifyClientsRepositoryInterface>);

const makeMappings = (): jest.Mocked<AnkifySyncMappingsRepositoryInterface> =>
  ({
    findBySourceId: jest.fn(async () => null),
    upsert: jest.fn(),
    listByClient: jest.fn(),
    findByAnkiNoteId: jest.fn(),
    deleteByAnkiNoteId: jest.fn(),
  } as unknown as jest.Mocked<AnkifySyncMappingsRepositoryInterface>);

const makeConflicts = (): jest.Mocked<AnkifySyncConflictsRepositoryInterface> =>
  ({
    hasPending: jest.fn(async () => false),
    recordOrFindPending: jest.fn(),
  } as unknown as jest.Mocked<AnkifySyncConflictsRepositoryInterface>);

const makeSubscriptionsRepo = (
  upsertResult: AnkifyNotionSubscription = sampleSubscription()
): jest.Mocked<AnkifyNotionSubscriptionsRepositoryInterface> =>
  ({
    upsert: jest.fn(async () => upsertResult),
    listByOwner: jest.fn(),
    listEnabled: jest.fn(),
    findByPageId: jest.fn(),
    findById: jest.fn(),
    setEnabled: jest.fn(),
    deleteById: jest.fn(),
    recordPoll: jest.fn(),
  } as unknown as jest.Mocked<AnkifyNotionSubscriptionsRepositoryInterface>);

const makeLogs = (): jest.Mocked<AnkifySyncLogsRepositoryInterface> =>
  ({
    log: jest.fn(async () => undefined),
    listByOwner: jest.fn(),
  } as unknown as jest.Mocked<AnkifySyncLogsRepositoryInterface>);

const makeNotionRepo = (
  token: string | null = 'notion-token'
): jest.Mocked<INotionRepository> =>
  ({
    getNotionData: jest.fn(),
    saveNotionToken: jest.fn(),
    getNotionToken: jest.fn(async () => token),
    deleteBlocksByOwner: jest.fn(),
    deleteNotionData: jest.fn(),
    markTokenInvalid: jest.fn(async () => undefined),
    clearTokenInvalid: jest.fn(async () => undefined),
  } as unknown as jest.Mocked<INotionRepository>);

const makeAnkiConnectStub = () =>
  ({
    createDeck: jest.fn(async () => 1),
    addNote: jest.fn(async () => 7),
    notesInfo: jest.fn(async () => []),
    updateNoteFields: jest.fn(async () => null),
    sync: jest.fn(async () => null),
    modelNames: jest.fn(async () => [] as string[]),
    createModel: jest.fn(async (_p: unknown) => ({ id: 1 })),
    updateModelStyling: jest.fn(async () => null),
    updateModelTemplates: jest.fn(async () => null),
    storeMediaFile: jest.fn(async () => 'stored.png'),
  } as unknown as AnkiConnectClient & { [k: string]: jest.Mock });

const makeRepos = () => ({
  clients: makeClients(),
  mappings: makeMappings(),
  conflicts: makeConflicts(),
  subscriptions: makeSubscriptionsRepo(),
  logs: makeLogs(),
  notionRepo: makeNotionRepo(),
});

describe('SyncNotionPageToRacUseCase', () => {
  const emptyWalkResult = () => ({
    cards: [] as WalkedNotionFlashcard[],
    diagnostic: { blocks_scanned: 0, blocks_matched: 0, pattern_hits: {} },
  });

  beforeEach(() => {
    (walkNotionPageForFlashcards as jest.Mock).mockReset();
    (walkNotionPageForFlashcards as jest.Mock).mockResolvedValue(emptyWalkResult());
  });

  test('persists icon returned by the page-meta fetcher on upsert', async () => {
    const clients = makeClients();
    const mappings = makeMappings();
    const conflicts = makeConflicts();
    const subscriptions = makeSubscriptionsRepo();
    const logs = makeLogs();
    const notionRepo = makeNotionRepo();
    const ac = makeAnkiConnectStub();

    const useCase = new SyncNotionPageToRacUseCase(
      clients,
      mappings,
      conflicts,
      subscriptions,
      logs,
      notionRepo,
      () => ac,
      () => async () => [],
      (_token: string) => async (_pageId: string) => ({
        title: 'Algebra',
        url: 'https://www.notion.so/algebra',
        icon: '📘',
      })
    );

    await useCase.execute({
      owner: 42,
      notionPageId: 'page-id',
      trigger: 'manual',
    });

    expect(subscriptions.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        notion_page_id: 'page-id',
        notion_page_title: 'Algebra',
        notion_page_url: 'https://www.notion.so/algebra',
        notion_page_icon: '📘',
      })
    );
  });

  test('lazy-fills missing icon on subsequent sync when the meta fetcher returns one', async () => {
    const clients = makeClients();
    const mappings = makeMappings();
    const conflicts = makeConflicts();
    const subscriptions = makeSubscriptionsRepo(
      sampleSubscription({ notion_page_icon: null })
    );
    const logs = makeLogs();
    const notionRepo = makeNotionRepo();
    const ac = makeAnkiConnectStub();

    const useCase = new SyncNotionPageToRacUseCase(
      clients,
      mappings,
      conflicts,
      subscriptions,
      logs,
      notionRepo,
      () => ac,
      () => async () => [],
      () => async () => ({
        title: null,
        url: null,
        icon: 'https://example.com/icon.png',
      })
    );

    await useCase.execute({
      owner: 42,
      notionPageId: 'page-id',
      trigger: 'polling',
    });

    expect(subscriptions.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        notion_page_icon: 'https://example.com/icon.png',
      })
    );
  });

  test('addNote uses the Ankify Basic model name', async () => {
    (walkNotionPageForFlashcards as jest.Mock).mockResolvedValue({ cards: [sampleCard()], diagnostic: { blocks_scanned: 1, blocks_matched: 1, pattern_hits: { toggle: 1 } } });
    const repos = makeRepos();
    const ac = makeAnkiConnectStub();
    const useCase = new SyncNotionPageToRacUseCase(
      repos.clients,
      repos.mappings,
      repos.conflicts,
      repos.subscriptions,
      repos.logs,
      repos.notionRepo,
      () => ac,
      () => async () => []
    );

    await useCase.execute({
      owner: 42,
      notionPageId: 'page-id',
      trigger: 'manual',
    });

    expect(ac.addNote).toHaveBeenCalledWith(
      expect.objectContaining({
        modelName: 'Ankify Basic',
        fields: { Front: 'Front text', Back: 'Back text' },
      })
    );
  });

  test('seeds Ankify note types before the first addNote call', async () => {
    (walkNotionPageForFlashcards as jest.Mock).mockResolvedValue({ cards: [sampleCard()], diagnostic: { blocks_scanned: 1, blocks_matched: 1, pattern_hits: { toggle: 1 } } });
    const repos = makeRepos();
    const ac = makeAnkiConnectStub();
    const callOrder: string[] = [];
    (ac.createModel as jest.Mock).mockImplementation(async () => {
      callOrder.push('createModel');
      return { id: 1 };
    });
    (ac.addNote as jest.Mock).mockImplementation(async () => {
      callOrder.push('addNote');
      return 7_777_777;
    });

    const useCase = new SyncNotionPageToRacUseCase(
      repos.clients,
      repos.mappings,
      repos.conflicts,
      repos.subscriptions,
      repos.logs,
      repos.notionRepo,
      () => ac,
      () => async () => []
    );

    await useCase.execute({
      owner: 42,
      notionPageId: 'page-id',
      trigger: 'manual',
    });

    expect(ac.modelNames).toHaveBeenCalled();
    const createdNames = (ac.createModel as jest.Mock).mock.calls.map(
      (args) => (args[0] as { modelName: string }).modelName
    );
    expect(createdNames).toEqual(
      expect.arrayContaining(['Ankify Basic', 'Ankify Cloze'])
    );
    expect(callOrder.indexOf('createModel')).toBeLessThan(
      callOrder.indexOf('addNote')
    );
  });

  test('addNote uses a per-page deck name nested under "Notion Sync"', async () => {
    (walkNotionPageForFlashcards as jest.Mock).mockResolvedValue({ cards: [sampleCard()], diagnostic: { blocks_scanned: 1, blocks_matched: 1, pattern_hits: { toggle: 1 } } });
    const repos = makeRepos();
    repos.subscriptions = makeSubscriptionsRepo(
      sampleSubscription({ notion_page_title: 'Algebra Basics' })
    );
    const ac = makeAnkiConnectStub();
    const useCase = new SyncNotionPageToRacUseCase(
      repos.clients,
      repos.mappings,
      repos.conflicts,
      repos.subscriptions,
      repos.logs,
      repos.notionRepo,
      () => ac,
      () => async () => [],
      () => async () => ({
        title: 'Algebra Basics',
        url: null,
        icon: null,
      })
    );

    await useCase.execute({
      owner: 42,
      notionPageId: 'page-id',
      trigger: 'manual',
    });

    expect(ac.createDeck).toHaveBeenCalledWith('Notion Sync::Algebra Basics');
    expect(ac.addNote).toHaveBeenCalledWith(
      expect.objectContaining({
        deckName: 'Notion Sync::Algebra Basics',
      })
    );
    expect(repos.mappings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        deck_name: 'Notion Sync::Algebra Basics',
      })
    );
  });

  test('falls back to "Notion Sync::Untitled" when the page title is null', async () => {
    (walkNotionPageForFlashcards as jest.Mock).mockResolvedValue({ cards: [sampleCard()], diagnostic: { blocks_scanned: 1, blocks_matched: 1, pattern_hits: { toggle: 1 } } });
    const repos = makeRepos();
    repos.subscriptions = makeSubscriptionsRepo(
      sampleSubscription({ notion_page_title: null })
    );
    const ac = makeAnkiConnectStub();
    const useCase = new SyncNotionPageToRacUseCase(
      repos.clients,
      repos.mappings,
      repos.conflicts,
      repos.subscriptions,
      repos.logs,
      repos.notionRepo,
      () => ac,
      () => async () => []
    );

    await useCase.execute({
      owner: 42,
      notionPageId: 'page-id',
      trigger: 'manual',
    });

    expect(ac.createDeck).toHaveBeenCalledWith('Notion Sync::Untitled');
    expect(ac.addNote).toHaveBeenCalledWith(
      expect.objectContaining({ deckName: 'Notion Sync::Untitled' })
    );
  });

  test('strips "::" from titles so users cannot accidentally nest deeper', async () => {
    (walkNotionPageForFlashcards as jest.Mock).mockResolvedValue({ cards: [sampleCard()], diagnostic: { blocks_scanned: 1, blocks_matched: 1, pattern_hits: { toggle: 1 } } });
    const repos = makeRepos();
    repos.subscriptions = makeSubscriptionsRepo(
      sampleSubscription({ notion_page_title: '  Quick::Tricks  ' })
    );
    const ac = makeAnkiConnectStub();
    const useCase = new SyncNotionPageToRacUseCase(
      repos.clients,
      repos.mappings,
      repos.conflicts,
      repos.subscriptions,
      repos.logs,
      repos.notionRepo,
      () => ac,
      () => async () => []
    );

    await useCase.execute({
      owner: 42,
      notionPageId: 'page-id',
      trigger: 'manual',
    });

    expect(ac.createDeck).toHaveBeenCalledWith('Notion Sync::QuickTricks');
  });

  test('refreshes model styling and templates after ensuring models exist', async () => {
    (walkNotionPageForFlashcards as jest.Mock).mockResolvedValue({ cards: [sampleCard()], diagnostic: { blocks_scanned: 1, blocks_matched: 1, pattern_hits: { toggle: 1 } } });
    const repos = makeRepos();
    const ac = makeAnkiConnectStub();
    const useCase = new SyncNotionPageToRacUseCase(
      repos.clients,
      repos.mappings,
      repos.conflicts,
      repos.subscriptions,
      repos.logs,
      repos.notionRepo,
      () => ac,
      () => async () => []
    );

    await useCase.execute({
      owner: 42,
      notionPageId: 'page-id',
      trigger: 'manual',
    });

    expect(ac.updateModelStyling).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Ankify Basic',
        css: expect.stringContaining('.card'),
      })
    );
    expect(ac.updateModelTemplates).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Ankify Basic',
        templates: expect.objectContaining({
          'Card 1': expect.objectContaining({
            Front: expect.stringContaining('{{Front}}'),
            Back: expect.stringContaining('{{Back}}'),
          }),
        }),
      })
    );
  });

  test('downloads Notion file images and pushes them to media before addNote', async () => {
    const sampleFetcher = jest.fn(async (url: string) => {
      expect(url).toBe('https://prod-files.notion.so/img.png?signed=1');
      return { status: 200, data: Buffer.from('PNGDATA') };
    });

    (walkNotionPageForFlashcards as jest.Mock).mockResolvedValue({
      cards: [
        sampleCard({
          back: 'See <img src="ankify-img-77.png">',
          media: [
            {
              block_id: 'img-77',
              kind: 'image',
              source: 'file',
              url: 'https://prod-files.notion.so/img.png?signed=1',
              filename: 'ankify-img-77.png',
            },
          ],
        }),
      ],
      diagnostic: { blocks_scanned: 1, blocks_matched: 1, pattern_hits: { toggle: 1 } },
    });

    const repos = makeRepos();
    const ac = makeAnkiConnectStub();
    const callOrder: string[] = [];
    (ac.storeMediaFile as jest.Mock).mockImplementation(async () => {
      callOrder.push('storeMediaFile');
      return 'ankify-img-77.png';
    });
    (ac.addNote as jest.Mock).mockImplementation(async () => {
      callOrder.push('addNote');
      return 12345;
    });

    const useCase = new SyncNotionPageToRacUseCase(
      repos.clients,
      repos.mappings,
      repos.conflicts,
      repos.subscriptions,
      repos.logs,
      repos.notionRepo,
      () => ac,
      () => async () => [],
      undefined,
      sampleFetcher
    );

    await useCase.execute({
      owner: 42,
      notionPageId: 'page-id',
      trigger: 'manual',
    });

    expect(ac.storeMediaFile).toHaveBeenCalledWith(
      expect.objectContaining({
        filename: 'ankify-img-77.png',
        data: expect.any(String),
      })
    );
    expect(callOrder.indexOf('storeMediaFile')).toBeLessThan(
      callOrder.indexOf('addNote')
    );
  });

  test('skips storeMediaFile for external-hosted images and still proceeds', async () => {
    (walkNotionPageForFlashcards as jest.Mock).mockResolvedValue({
      cards: [
        sampleCard({
          back: '<img src="https://cdn.example.com/x.png">',
          media: [
            {
              block_id: 'img-ext',
              kind: 'image',
              source: 'external',
              url: 'https://cdn.example.com/x.png',
            },
          ],
        }),
      ],
      diagnostic: { blocks_scanned: 1, blocks_matched: 1, pattern_hits: { toggle: 1 } },
    });
    const repos = makeRepos();
    const ac = makeAnkiConnectStub();
    const useCase = new SyncNotionPageToRacUseCase(
      repos.clients,
      repos.mappings,
      repos.conflicts,
      repos.subscriptions,
      repos.logs,
      repos.notionRepo,
      () => ac,
      () => async () => []
    );

    await useCase.execute({
      owner: 42,
      notionPageId: 'page-id',
      trigger: 'manual',
    });

    expect(ac.storeMediaFile).not.toHaveBeenCalled();
    expect(ac.addNote).toHaveBeenCalled();
  });

  test('records sync_logs error but does not fail when image download fails', async () => {
    const failingFetch = jest.fn(async () => {
      throw new Error('network down');
    });

    (walkNotionPageForFlashcards as jest.Mock).mockResolvedValue({
      cards: [
        sampleCard({
          media: [
            {
              block_id: 'img-bad',
              kind: 'image',
              source: 'file',
              url: 'https://prod-files.notion.so/bad.png?signed=1',
              filename: 'ankify-img-bad.png',
            },
          ],
        }),
      ],
      diagnostic: { blocks_scanned: 1, blocks_matched: 1, pattern_hits: { toggle: 1 } },
    });
    const repos = makeRepos();
    const ac = makeAnkiConnectStub();
    const useCase = new SyncNotionPageToRacUseCase(
      repos.clients,
      repos.mappings,
      repos.conflicts,
      repos.subscriptions,
      repos.logs,
      repos.notionRepo,
      () => ac,
      () => async () => [],
      undefined,
      failingFetch
    );

    const result = await useCase.execute({
      owner: 42,
      notionPageId: 'page-id',
      trigger: 'manual',
    });

    expect(ac.storeMediaFile).not.toHaveBeenCalled();
    expect(ac.addNote).toHaveBeenCalled();
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toMatch(/img-bad/);
  });

  test('orphan recovery: when a mapped Anki note no longer exists, drops the mapping and recreates the note', async () => {
    (walkNotionPageForFlashcards as jest.Mock).mockResolvedValue({ cards: [sampleCard()], diagnostic: { blocks_scanned: 1, blocks_matched: 1, pattern_hits: { toggle: 1 } } });
    const repos = makeRepos();
    const existingMapping = {
      id: 1,
      ankify_client_id: 1,
      source_id: 'block-1',
      source_type: 'notion_block' as const,
      anki_note_id: 9999,
      deck_name: 'Notion Sync::Untitled',
      last_synced_at: new Date(Date.now() - 60_000),
    };
    repos.mappings.findBySourceId = jest.fn(
      async (_clientId: number, _sourceId: string) => existingMapping
    );
    repos.mappings.upsert = jest.fn(async (input) => ({
      ...existingMapping,
      anki_note_id: input.anki_note_id,
    }));
    const ac = makeAnkiConnectStub();
    (ac.notesInfo as jest.Mock).mockResolvedValueOnce([{}]);
    (ac.addNote as jest.Mock).mockResolvedValueOnce(424242);

    const useCase = new SyncNotionPageToRacUseCase(
      repos.clients,
      repos.mappings,
      repos.conflicts,
      repos.subscriptions,
      repos.logs,
      repos.notionRepo,
      () => ac,
      () => async () => []
    );

    const result = await useCase.execute({
      owner: 42,
      notionPageId: 'page-id',
      trigger: 'polling',
    });

    expect(repos.mappings.deleteByAnkiNoteId).toHaveBeenCalledWith(1, 9999);
    expect(ac.addNote).toHaveBeenCalled();
    expect(repos.mappings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ anki_note_id: 424242, source_id: 'block-1' })
    );
    expect(ac.updateNoteFields).not.toHaveBeenCalled();
    expect(result.created).toBe(1);
    expect(result.errors).toEqual([]);
  });

  test('a second sync for the same client reuses the cache and skips modelNames', async () => {
    (walkNotionPageForFlashcards as jest.Mock).mockResolvedValue({ cards: [sampleCard()], diagnostic: { blocks_scanned: 1, blocks_matched: 1, pattern_hits: { toggle: 1 } } });
    const repos = makeRepos();
    const ac = makeAnkiConnectStub();
    const useCase = new SyncNotionPageToRacUseCase(
      repos.clients,
      repos.mappings,
      repos.conflicts,
      repos.subscriptions,
      repos.logs,
      repos.notionRepo,
      () => ac,
      () => async () => []
    );

    await useCase.execute({
      owner: 42,
      notionPageId: 'page-id',
      trigger: 'manual',
    });
    (ac.modelNames as jest.Mock).mockClear();
    (ac.createModel as jest.Mock).mockClear();

    await useCase.execute({
      owner: 42,
      notionPageId: 'page-id',
      trigger: 'polling',
    });

    expect(ac.modelNames).not.toHaveBeenCalled();
    expect(ac.createModel).not.toHaveBeenCalled();
  });

  test('disables subscription when runSync throws object_not_found', async () => {
    const notFoundError = Object.assign(new Error('Could not find object'), {
      code: 'object_not_found',
    });
    (walkNotionPageForFlashcards as jest.Mock).mockRejectedValue(notFoundError);
    const subscriptions = makeSubscriptionsRepo();
    const ac = makeAnkiConnectStub();
    const useCase = new SyncNotionPageToRacUseCase(
      makeClients(),
      makeMappings(),
      makeConflicts(),
      subscriptions,
      makeLogs(),
      makeNotionRepo(),
      () => ac,
      () => async () => []
    );

    let thrownError: unknown;
    try {
      await useCase.execute({
        owner: 42,
        notionPageId: 'page-id',
        trigger: 'polling',
      });
    } catch (error) {
      thrownError = error;
    }

    expect((thrownError as Error).message).toBe('Could not find object');
    expect(subscriptions.setEnabled).toHaveBeenCalledWith(1, false);
    expect(subscriptions.recordPoll).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ error: 'Could not find object' })
    );
  });

  test('result includes a diagnostic when walkNotionPageForFlashcards returns one', async () => {
    (walkNotionPageForFlashcards as jest.Mock).mockResolvedValue({
      cards: [],
      diagnostic: {
        blocks_scanned: 5,
        blocks_matched: 0,
        pattern_hits: {},
        unmatched_samples: ['Introduction', 'Summary'],
      },
    });
    const repos = makeRepos();
    const ac = makeAnkiConnectStub();
    const useCase = new SyncNotionPageToRacUseCase(
      repos.clients,
      repos.mappings,
      repos.conflicts,
      repos.subscriptions,
      repos.logs,
      repos.notionRepo,
      () => ac,
      () => async () => []
    );

    const result = await useCase.execute({
      owner: 42,
      notionPageId: 'page-id',
      trigger: 'manual',
    });

    expect(result.diagnostic).toEqual({
      blocks_scanned: 5,
      blocks_matched: 0,
      pattern_hits: {},
      unmatched_samples: ['Introduction', 'Summary'],
    });
  });

  test('diagnostic is persisted in the sync log payload', async () => {
    (walkNotionPageForFlashcards as jest.Mock).mockResolvedValue({
      cards: [],
      diagnostic: {
        blocks_scanned: 3,
        blocks_matched: 0,
        pattern_hits: {},
        unmatched_samples: ['Heading A'],
      },
    });
    const repos = makeRepos();
    const ac = makeAnkiConnectStub();
    const useCase = new SyncNotionPageToRacUseCase(
      repos.clients,
      repos.mappings,
      repos.conflicts,
      repos.subscriptions,
      repos.logs,
      repos.notionRepo,
      () => ac,
      () => async () => []
    );

    await useCase.execute({
      owner: 42,
      notionPageId: 'page-id',
      trigger: 'polling',
    });

    expect(repos.logs.log).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          diagnostic: expect.objectContaining({
            blocks_scanned: 3,
            blocks_matched: 0,
            unmatched_samples: ['Heading A'],
          }),
        }),
      })
    );
  });

  test('does not disable subscription for non-not-found errors', async () => {
    const genericError = new Error('rate_limited');
    (walkNotionPageForFlashcards as jest.Mock).mockRejectedValue(genericError);
    const repos = makeRepos();
    const ac = makeAnkiConnectStub();
    const useCase = new SyncNotionPageToRacUseCase(
      repos.clients,
      repos.mappings,
      repos.conflicts,
      repos.subscriptions,
      repos.logs,
      repos.notionRepo,
      () => ac,
      () => async () => []
    );

    await expect(
      useCase.execute({
        owner: 42,
        notionPageId: 'page-id',
        trigger: 'polling',
      })
    ).rejects.toThrow('rate_limited');

    expect(repos.subscriptions.setEnabled).not.toHaveBeenCalled();
  });

  describe('zero-card structured event emission', () => {
    const makeErrorEventRepo = (): jest.Mocked<IErrorEventRepository> => ({
      insert: jest.fn().mockResolvedValue(undefined),
      existsWithinWindow: jest.fn().mockResolvedValue(false),
      listGroups: jest.fn().mockResolvedValue([]),
      countGroups: jest.fn().mockResolvedValue(0),
      latestSamples: jest.fn().mockResolvedValue([]),
      resolveGroup: jest.fn().mockResolvedValue(undefined),
      reopenGroup: jest.fn().mockResolvedValue(undefined),
    });

    it('emits ankify.zero_cards event when page produces no cards', async () => {
      const repos = makeRepos();
      const ac = makeAnkiConnectStub();
      const errorEventRepo = makeErrorEventRepo();
      (walkNotionPageForFlashcards as jest.Mock).mockResolvedValue({
        cards: [],
        diagnostic: { blocks_scanned: 5, blocks_matched: 0, pattern_hits: {} },
      });

      const useCase = new SyncNotionPageToRacUseCase(
        repos.clients,
        repos.mappings,
        repos.conflicts,
        repos.subscriptions,
        repos.logs,
        repos.notionRepo,
        () => ac,
        () => async () => [],
        undefined,
        undefined,
        errorEventRepo
      );

      await useCase.execute({ owner: 42, notionPageId: 'page-abc', trigger: 'manual' });

      expect(errorEventRepo.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'server',
          message: 'ankify.zero_cards',
          context: expect.objectContaining({
            user_id: 42,
            source_type: 'notion_page',
            parser_path: 'ankify/notionPageWalker',
            reason_code: 'all_blocks_unmatched',
            blocks_scanned: 5,
          }),
        })
      );
    });

    it('derives reason_code empty_page when blocks_scanned is zero', async () => {
      const repos = makeRepos();
      const ac = makeAnkiConnectStub();
      const errorEventRepo = makeErrorEventRepo();
      (walkNotionPageForFlashcards as jest.Mock).mockResolvedValue({
        cards: [],
        diagnostic: { blocks_scanned: 0, blocks_matched: 0, pattern_hits: {} },
      });

      const useCase = new SyncNotionPageToRacUseCase(
        repos.clients,
        repos.mappings,
        repos.conflicts,
        repos.subscriptions,
        repos.logs,
        repos.notionRepo,
        () => ac,
        () => async () => [],
        undefined,
        undefined,
        errorEventRepo
      );

      await useCase.execute({ owner: 42, notionPageId: 'page-empty', trigger: 'polling' });

      expect(errorEventRepo.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({ reason_code: 'empty_page' }),
        })
      );
    });

    it('does not emit zero_cards event when cards are produced', async () => {
      const repos = makeRepos();
      const ac = makeAnkiConnectStub();
      const errorEventRepo = makeErrorEventRepo();
      (walkNotionPageForFlashcards as jest.Mock).mockResolvedValue({
        cards: [sampleCard()],
        diagnostic: { blocks_scanned: 1, blocks_matched: 1, pattern_hits: { toggle: 1 } },
      });

      const useCase = new SyncNotionPageToRacUseCase(
        repos.clients,
        repos.mappings,
        repos.conflicts,
        repos.subscriptions,
        repos.logs,
        repos.notionRepo,
        () => ac,
        () => async () => [],
        undefined,
        undefined,
        errorEventRepo
      );

      await useCase.execute({ owner: 42, notionPageId: 'page-with-cards', trigger: 'manual' });

      expect(errorEventRepo.insert).not.toHaveBeenCalled();
    });

    it('does not throw if errorEventRepo is not provided', async () => {
      const repos = makeRepos();
      const ac = makeAnkiConnectStub();
      (walkNotionPageForFlashcards as jest.Mock).mockResolvedValue({
        cards: [],
        diagnostic: { blocks_scanned: 3, blocks_matched: 0, pattern_hits: {} },
      });

      const useCase = new SyncNotionPageToRacUseCase(
        repos.clients,
        repos.mappings,
        repos.conflicts,
        repos.subscriptions,
        repos.logs,
        repos.notionRepo,
        () => ac,
        () => async () => []
      );

      await expect(
        useCase.execute({ owner: 42, notionPageId: 'page-no-repo', trigger: 'manual' })
      ).resolves.not.toThrow();
    });
  });

  test('marks token invalid and disables subscription when Notion returns Unauthorized', async () => {
    const unauthorizedError = Object.assign(new Error('API token is invalid.'), {
      code: 'unauthorized',
      status: 401,
    });
    (walkNotionPageForFlashcards as jest.Mock).mockRejectedValue(unauthorizedError);
    const repos = makeRepos();
    const ac = makeAnkiConnectStub();
    const useCase = new SyncNotionPageToRacUseCase(
      repos.clients,
      repos.mappings,
      repos.conflicts,
      repos.subscriptions,
      repos.logs,
      repos.notionRepo,
      () => ac,
      () => async () => []
    );

    await expect(
      useCase.execute({
        owner: 42,
        notionPageId: 'page-id',
        trigger: 'polling',
      })
    ).rejects.toThrow('API token is invalid.');

    expect(repos.notionRepo.markTokenInvalid).toHaveBeenCalledWith(42);
    expect(repos.subscriptions.setEnabled).toHaveBeenCalledWith(1, false);
  });

  describe('default media fetcher routes through the SSRF guard', () => {
    const fileMediaCard = (url: string) =>
      sampleCard({
        back: 'See <img src="ankify-img-1.png">',
        media: [
          {
            block_id: 'img-1',
            kind: 'image',
            source: 'file',
            url,
            filename: 'ankify-img-1.png',
          },
        ],
      });

    beforeEach(() => {
      mockAxiosGet.mockReset();
      mockDnsLookup.mockReset();
    });

    const buildUseCase = (
      repos: ReturnType<typeof makeRepos>,
      ac: AnkiConnectClient
    ) =>
      new SyncNotionPageToRacUseCase(
        repos.clients,
        repos.mappings,
        repos.conflicts,
        repos.subscriptions,
        repos.logs,
        repos.notionRepo,
        () => ac,
        () => async () => []
      );

    it('refuses a loopback media URL and stores no media', async () => {
      (walkNotionPageForFlashcards as jest.Mock).mockResolvedValue({
        cards: [fileMediaCard('http://127.0.0.1/secret.png')],
        diagnostic: { blocks_scanned: 1, blocks_matched: 1, pattern_hits: { toggle: 1 } },
      });
      const repos = makeRepos();
      const ac = makeAnkiConnectStub();

      const result = await buildUseCase(repos, ac).execute({
        owner: 42,
        notionPageId: 'page-id',
        trigger: 'manual',
      });

      expect(mockAxiosGet).not.toHaveBeenCalled();
      expect(ac.storeMediaFile).not.toHaveBeenCalled();
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toMatch(/img-1/);
      expect(ac.addNote).toHaveBeenCalled();
    });

    it('refuses a link-local metadata media URL and stores no media', async () => {
      (walkNotionPageForFlashcards as jest.Mock).mockResolvedValue({
        cards: [fileMediaCard('http://169.254.169.254/latest/meta-data/')],
        diagnostic: { blocks_scanned: 1, blocks_matched: 1, pattern_hits: { toggle: 1 } },
      });
      const repos = makeRepos();
      const ac = makeAnkiConnectStub();

      const result = await buildUseCase(repos, ac).execute({
        owner: 42,
        notionPageId: 'page-id',
        trigger: 'manual',
      });

      expect(mockAxiosGet).not.toHaveBeenCalled();
      expect(ac.storeMediaFile).not.toHaveBeenCalled();
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('fetches a public media URL through the guard and stores the bytes', async () => {
      mockDnsLookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
      mockAxiosGet.mockResolvedValue({
        status: 200,
        data: Buffer.from('PNGDATA'),
      });
      (walkNotionPageForFlashcards as jest.Mock).mockResolvedValue({
        cards: [fileMediaCard('https://prod-files.notion.so/img.png?signed=1')],
        diagnostic: { blocks_scanned: 1, blocks_matched: 1, pattern_hits: { toggle: 1 } },
      });
      const repos = makeRepos();
      const ac = makeAnkiConnectStub();

      const result = await buildUseCase(repos, ac).execute({
        owner: 42,
        notionPageId: 'page-id',
        trigger: 'manual',
      });

      expect(mockAxiosGet).toHaveBeenCalledWith(
        'https://prod-files.notion.so/img.png?signed=1',
        expect.objectContaining({ responseType: 'arraybuffer' })
      );
      expect(ac.storeMediaFile).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: 'ankify-img-1.png',
          data: Buffer.from('PNGDATA').toString('base64'),
        })
      );
      expect(result.errors).toEqual([]);
    });
  });
});
