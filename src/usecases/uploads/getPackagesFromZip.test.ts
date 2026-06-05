import { setupTests } from '../../test/configure-jest';
import { getPackagesFromZip } from './getPackagesFromZip';
import CardOption from '../../lib/parser/Settings/CardOption';
import Workspace from '../../lib/parser/WorkSpace';

jest.mock('../../infrastracture/adapters/fileConversion/PrepareDeck');
jest.mock('../../lib/zip/zip');
jest.mock('../../lib/anki/CardGenerator');
jest.mock('../../lib/parser/WorkSpace');

const mockPrepareDeck = jest.requireMock<{
  PrepareDeck: jest.Mock;
  prepareDeckInfoOnly: jest.Mock;
}>('../../infrastracture/adapters/fileConversion/PrepareDeck').PrepareDeck;

const mockPrepareDeckInfoOnly = jest.requireMock<{
  PrepareDeck: jest.Mock;
  prepareDeckInfoOnly: jest.Mock;
}>(
  '../../infrastracture/adapters/fileConversion/PrepareDeck'
).prepareDeckInfoOnly;

const mockCardGeneratorClass = jest.requireMock<{ default: jest.Mock }>(
  '../../lib/anki/CardGenerator'
).default;

const mockZipHandlerClass = jest.requireMock<{ ZipHandler: jest.Mock }>(
  '../../lib/zip/zip'
).ZipHandler;

const FAKE_WORKSPACE_LOCATION = '/fake/workspace';

beforeEach(() => {
  setupTests();
  jest.clearAllMocks();

  (Workspace as unknown as Record<string, jest.Mock>).subdir = jest
    .fn()
    .mockReturnValue({ location: `${FAKE_WORKSPACE_LOCATION}/sub` });

  mockCardGeneratorClass.mockImplementation(() => ({
    runBatch: jest.fn().mockResolvedValue([]),
  }));
});

describe('getPackagesFromZip — batch concurrency', () => {
  it('returns all packages when batch mode resolves correctly', async () => {
    const fileCount = 8;
    const fileNames = Array.from(
      { length: fileCount },
      (_, i) => `deck${i}.html`
    );

    mockZipHandlerClass.mockImplementation(() => ({
      build: jest.fn().mockResolvedValue(undefined),
      getFileNames: jest.fn().mockReturnValue(fileNames),
      files: fileNames.map((name) => ({ name, contents: '<html></html>' })),
    }));

    mockPrepareDeckInfoOnly.mockImplementation(({ name }: { name: string }) =>
      Promise.resolve({
        deckInfoPath: `/fake/${name}/deck_info.json`,
        outputPath: `/fake/${name}/out.apkg`,
        name,
        inputFileName: name,
        deck: [],
        cardCount: 1,
        needsIndividualBuild: false,
      })
    );

    mockCardGeneratorClass.mockImplementation(() => ({
      runBatch: jest
        .fn()
        .mockImplementation((entries: Array<{ output: string }>) =>
          Promise.resolve(entries.map((e) => e.output))
        ),
    }));

    jest
      .spyOn(require('node:fs'), 'readFileSync')
      .mockReturnValue(Buffer.from('fake-apkg'));

    const settings = new CardOption({});
    const workspace = { location: FAKE_WORKSPACE_LOCATION } as Workspace;

    const result = await getPackagesFromZip(
      Buffer.from('fake-zip') as unknown as Uint8Array,
      false,
      settings,
      workspace
    );

    expect(result.packages).toHaveLength(fileCount);
  });

  it('passes parent workspace as outputWorkspace so .apkg files land where the downloader looks', async () => {
    const fileNames = ['deck0.html', 'deck1.html', 'deck2.html'];

    mockZipHandlerClass.mockImplementation(() => ({
      build: jest.fn().mockResolvedValue(undefined),
      getFileNames: jest.fn().mockReturnValue(fileNames),
      files: fileNames.map((name) => ({ name, contents: '<html></html>' })),
    }));

    mockPrepareDeckInfoOnly.mockImplementation(({ name }: { name: string }) =>
      Promise.resolve({
        deckInfoPath: `/fake/${name}/deck_info.json`,
        outputPath: `${FAKE_WORKSPACE_LOCATION}/${name}.apkg`,
        name,
        inputFileName: name,
        deck: [],
        cardCount: 1,
        needsIndividualBuild: false,
      })
    );

    mockCardGeneratorClass.mockImplementation(() => ({
      runBatch: jest
        .fn()
        .mockImplementation((entries: Array<{ output: string }>) =>
          Promise.resolve(entries.map((e) => e.output))
        ),
    }));

    process.env.UPLOAD_BUILD_CONCURRENCY = '1';

    const settings = new CardOption({});
    const workspace = { location: FAKE_WORKSPACE_LOCATION } as Workspace;

    await getPackagesFromZip(
      Buffer.from('fake-zip') as unknown as Uint8Array,
      false,
      settings,
      workspace
    );

    delete process.env.UPLOAD_BUILD_CONCURRENCY;

    expect(mockPrepareDeckInfoOnly).toHaveBeenCalled();
    for (const call of mockPrepareDeckInfoOnly.mock.calls) {
      const [, deckSubWorkspace, outputWorkspace] = call;
      expect(outputWorkspace).toBe(workspace);
      expect(outputWorkspace.location).toBe(FAKE_WORKSPACE_LOCATION);
      expect(deckSubWorkspace.location).not.toBe(FAKE_WORKSPACE_LOCATION);
    }
  });

  it('falls through to single-file path when only one file is in the zip', async () => {
    const fileNames = ['only.html'];

    mockZipHandlerClass.mockImplementation(() => ({
      build: jest.fn().mockResolvedValue(undefined),
      getFileNames: jest.fn().mockReturnValue(fileNames),
      files: fileNames.map((name) => ({ name, contents: '<html></html>' })),
    }));

    mockPrepareDeck.mockResolvedValue({
      name: 'only.html',
      apkg: Buffer.from(''),
      deck: [],
      cardCount: 1,
    });

    const settings = new CardOption({});
    const workspace = { location: FAKE_WORKSPACE_LOCATION } as Workspace;

    await getPackagesFromZip(
      Buffer.from('fake-zip') as unknown as Uint8Array,
      false,
      settings,
      workspace
    );

    expect(mockPrepareDeck).toHaveBeenCalledTimes(1);
    expect(mockPrepareDeckInfoOnly).not.toHaveBeenCalled();
  });

  it('caps batch chunks at UPLOAD_BUILD_CONCURRENCY (default 4)', async () => {
    const fileCount = 12;
    const fileNames = Array.from(
      { length: fileCount },
      (_, i) => `deck${i}.html`
    );

    mockZipHandlerClass.mockImplementation(() => ({
      build: jest.fn().mockResolvedValue(undefined),
      getFileNames: jest.fn().mockReturnValue(fileNames),
      files: fileNames.map((name) => ({ name, contents: '<html></html>' })),
    }));

    mockPrepareDeckInfoOnly.mockImplementation(({ name }: { name: string }) =>
      Promise.resolve({
        deckInfoPath: `/fake/${name}/deck_info.json`,
        outputPath: `/fake/${name}/out.apkg`,
        name,
        inputFileName: name,
        deck: [],
        cardCount: 1,
        needsIndividualBuild: false,
      })
    );

    let runBatchCallCount = 0;
    mockCardGeneratorClass.mockImplementation(() => ({
      runBatch: jest
        .fn()
        .mockImplementation((entries: Array<{ output: string }>) => {
          runBatchCallCount += 1;
          return Promise.resolve(entries.map((e) => e.output));
        }),
    }));

    jest
      .spyOn(require('node:fs'), 'readFileSync')
      .mockReturnValue(Buffer.from('fake-apkg'));

    delete process.env.UPLOAD_BUILD_CONCURRENCY;

    const settings = new CardOption({});
    const workspace = { location: FAKE_WORKSPACE_LOCATION } as Workspace;

    await getPackagesFromZip(
      Buffer.from('fake-zip') as unknown as Uint8Array,
      false,
      settings,
      workspace
    );

    expect(runBatchCallCount).toBeLessThanOrEqual(4);
  });

  it('respects UPLOAD_BUILD_CONCURRENCY env override', async () => {
    process.env.UPLOAD_BUILD_CONCURRENCY = '2';

    const fileCount = 6;
    const fileNames = Array.from(
      { length: fileCount },
      (_, i) => `deck${i}.html`
    );

    mockZipHandlerClass.mockImplementation(() => ({
      build: jest.fn().mockResolvedValue(undefined),
      getFileNames: jest.fn().mockReturnValue(fileNames),
      files: fileNames.map((name) => ({ name, contents: '<html></html>' })),
    }));

    mockPrepareDeckInfoOnly.mockImplementation(({ name }: { name: string }) =>
      Promise.resolve({
        deckInfoPath: `/fake/${name}/deck_info.json`,
        outputPath: `/fake/${name}/out.apkg`,
        name,
        inputFileName: name,
        deck: [],
        cardCount: 1,
        needsIndividualBuild: false,
      })
    );

    let runBatchCallCount = 0;
    mockCardGeneratorClass.mockImplementation(() => ({
      runBatch: jest
        .fn()
        .mockImplementation((entries: Array<{ output: string }>) => {
          runBatchCallCount += 1;
          return Promise.resolve(entries.map((e) => e.output));
        }),
    }));

    jest
      .spyOn(require('node:fs'), 'readFileSync')
      .mockReturnValue(Buffer.from('fake-apkg'));

    const settings = new CardOption({});
    const workspace = { location: FAKE_WORKSPACE_LOCATION } as Workspace;

    await getPackagesFromZip(
      Buffer.from('fake-zip') as unknown as Uint8Array,
      false,
      settings,
      workspace
    );

    expect(runBatchCallCount).toBeLessThanOrEqual(2);

    delete process.env.UPLOAD_BUILD_CONCURRENCY;
  });

  it('propagates errors from runBatch', async () => {
    const fileCount = 8;
    const fileNames = Array.from(
      { length: fileCount },
      (_, i) => `deck${i}.html`
    );

    mockZipHandlerClass.mockImplementation(() => ({
      build: jest.fn().mockResolvedValue(undefined),
      getFileNames: jest.fn().mockReturnValue(fileNames),
      files: fileNames.map((name) => ({ name, contents: '<html></html>' })),
    }));

    mockPrepareDeckInfoOnly.mockImplementation(({ name }: { name: string }) =>
      Promise.resolve({
        deckInfoPath: `/fake/${name}/deck_info.json`,
        outputPath: `/fake/${name}/out.apkg`,
        name,
        inputFileName: name,
        deck: [],
        cardCount: 1,
        needsIndividualBuild: false,
      })
    );

    mockCardGeneratorClass.mockImplementation(() => ({
      runBatch: jest.fn().mockRejectedValue(new Error('Python batch failed')),
    }));

    const settings = new CardOption({});
    const workspace = { location: FAKE_WORKSPACE_LOCATION } as Workspace;

    await expect(
      getPackagesFromZip(
        Buffer.from('fake-zip') as unknown as Uint8Array,
        false,
        settings,
        workspace
      )
    ).rejects.toThrow('Python batch failed');
  });

  it('returns empty packages when fileContents is undefined', async () => {
    const settings = new CardOption({});
    const workspace = { location: FAKE_WORKSPACE_LOCATION } as Workspace;

    const result = await getPackagesFromZip(
      undefined,
      false,
      settings,
      workspace
    );

    expect(result.packages).toEqual([]);
  });
});
