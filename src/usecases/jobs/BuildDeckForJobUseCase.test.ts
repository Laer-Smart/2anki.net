import { BuildDeckForJobUseCase } from './BuildDeckForJobUseCase';
import { EmptyDeckError } from './EmptyDeckError';
import JobRepository from '../../data_layer/JobRepository';
import { IUploadRepository } from '../../data_layer/UploadRespository';
import Uploads from '../../data_layer/public/Uploads';
import Deck from '../../lib/parser/Deck';
import CustomExporter from '../../lib/parser/exporters/CustomExporter';
import BlockHandler from '../../services/NotionService/BlockHandler/BlockHandler';
import Workspace from '../../lib/parser/WorkSpace';
import StorageHandler from '../../lib/storage/StorageHandler';
import CardOption from '../../lib/parser/Settings';
import CardGenerator from '../../lib/anki/CardGenerator';
import fsPromises from 'node:fs/promises';
import { getDatabase } from '../../data_layer';

jest.mock('../../lib/anki/CardGenerator');
jest.mock('../../data_layer', () => ({
  getDatabase: jest.fn(),
}));
jest.mock('node:fs/promises', () => ({
  __esModule: true,
  default: { readFile: jest.fn() },
  readFile: jest.fn(),
}));
jest.mock('../../lib/misc/file', () => ({
  FileSizeInMegaBytes: jest.fn().mockReturnValue(1),
}));

function buildUploadRepository(): jest.Mocked<IUploadRepository> {
  return {
    deleteUpload: jest.fn().mockResolvedValue(1),
    getUploadsByOwner: jest.fn().mockResolvedValue([]),
    findByIdAndOwner: jest.fn().mockResolvedValue(null),
    findByKey: jest.fn().mockResolvedValue(null),
    findAllByObjectIdAndOwner: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue([]),
    getLastUploadForUser: jest.fn().mockResolvedValue(null),
    getLastReconvertibleUpload: jest.fn().mockResolvedValue(null),
    findByOwnerAndDedupeKey: jest.fn().mockResolvedValue(null),
    insertNativeDeck: jest.fn(),
    insertConvertedDeck: jest.fn(),
  };
}

describe('BuildDeckForJobUseCase', () => {
  const jobRepository = {
    updateJobStatus: jest.fn().mockResolvedValue(undefined),
  } as unknown as JobRepository;

  const exporter = {
    configure: jest.fn(),
  } as unknown as CustomExporter;

  const bl = { firstPageTitle: 'Title' } as unknown as BlockHandler;
  const ws = { location: '/tmp/ws' } as unknown as Workspace;
  const settings = { deckName: 'Deck' } as unknown as CardOption;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws EmptyDeckError when every deck has zero cards and never invokes CardGenerator', async () => {
    const storage = {
      uniqify: jest.fn(),
      uploadFile: jest.fn(),
      delete: jest.fn(),
    } as unknown as StorageHandler;
    const uploadRepository = buildUploadRepository();
    const useCase = new BuildDeckForJobUseCase(jobRepository, uploadRepository);
    const decks: Deck[] = [
      { cards: [] } as unknown as Deck,
      { cards: [] } as unknown as Deck,
    ];

    await expect(
      useCase.execute({
        bl,
        exporter,
        decks,
        ws,
        settings,
        storage,
        id: 'job-1',
        owner: 'owner-1',
      })
    ).rejects.toBeInstanceOf(EmptyDeckError);

    expect(CardGenerator).not.toHaveBeenCalled();
    expect(exporter.configure).not.toHaveBeenCalled();
    expect(uploadRepository.findAllByObjectIdAndOwner).not.toHaveBeenCalled();
  });

  describe('prior-upload prune on re-conversion', () => {
    const MockCardGenerator = CardGenerator as jest.MockedClass<
      typeof CardGenerator
    >;
    const mockReadFile = fsPromises.readFile as jest.Mock;
    const mockGetDatabase = getDatabase as jest.Mock;

    beforeEach(() => {
      MockCardGenerator.mockImplementation(
        () =>
          ({
            run: jest.fn().mockResolvedValue('/tmp/ws/deck.apkg'),
          }) as unknown as InstanceType<typeof CardGenerator>
      );
      mockReadFile.mockResolvedValue(Buffer.from('apkg-bytes'));
      mockGetDatabase.mockReturnValue(() => ({
        insert: jest.fn().mockResolvedValue(1),
      }));
    });

    it('deletes the S3 object and DB row for every prior upload after inserting the new one', async () => {
      const storage = {
        uniqify: jest.fn().mockReturnValue('new-key.apkg'),
        uploadFile: jest.fn().mockResolvedValue(undefined),
        delete: jest.fn().mockResolvedValue(true),
      } as unknown as StorageHandler;
      const uploadRepository = buildUploadRepository();
      uploadRepository.findAllByObjectIdAndOwner.mockResolvedValue([
        { id: 1, owner: 7, key: 'old-1.apkg', object_id: 'page-x' } as Uploads,
        { id: 2, owner: 7, key: 'old-2.apkg', object_id: 'page-x' } as Uploads,
      ]);

      const useCase = new BuildDeckForJobUseCase(
        jobRepository,
        uploadRepository
      );
      await useCase.execute({
        bl,
        exporter,
        decks: [{ cards: [{}] }] as unknown as Deck[],
        ws,
        settings,
        storage,
        id: 'page-x',
        owner: '7',
      });

      expect(uploadRepository.findAllByObjectIdAndOwner).toHaveBeenCalledWith(
        'page-x',
        7
      );
      expect(storage.delete).toHaveBeenCalledWith('old-1.apkg');
      expect(storage.delete).toHaveBeenCalledWith('old-2.apkg');
      expect(uploadRepository.deleteUpload).toHaveBeenCalledWith(
        7,
        'old-1.apkg'
      );
      expect(uploadRepository.deleteUpload).toHaveBeenCalledWith(
        7,
        'old-2.apkg'
      );
    });

    it('makes no prune calls when there are no prior uploads', async () => {
      const storage = {
        uniqify: jest.fn().mockReturnValue('new-key.apkg'),
        uploadFile: jest.fn().mockResolvedValue(undefined),
        delete: jest.fn().mockResolvedValue(true),
      } as unknown as StorageHandler;
      const uploadRepository = buildUploadRepository();

      const useCase = new BuildDeckForJobUseCase(
        jobRepository,
        uploadRepository
      );
      await useCase.execute({
        bl,
        exporter,
        decks: [{ cards: [{}] }] as unknown as Deck[],
        ws,
        settings,
        storage,
        id: 'page-x',
        owner: '7',
      });

      expect(storage.delete).not.toHaveBeenCalled();
      expect(uploadRepository.deleteUpload).not.toHaveBeenCalled();
    });

    it('keeps going when a prune step throws (best-effort cleanup)', async () => {
      const storage = {
        uniqify: jest.fn().mockReturnValue('new-key.apkg'),
        uploadFile: jest.fn().mockResolvedValue(undefined),
        delete: jest
          .fn()
          .mockRejectedValueOnce(new Error('s3 boom'))
          .mockResolvedValue(true),
      } as unknown as StorageHandler;
      const uploadRepository = buildUploadRepository();
      uploadRepository.findAllByObjectIdAndOwner.mockResolvedValue([
        { id: 1, owner: 7, key: 'old-1.apkg', object_id: 'page-x' } as Uploads,
        { id: 2, owner: 7, key: 'old-2.apkg', object_id: 'page-x' } as Uploads,
      ]);
      const consoleErr = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);

      const useCase = new BuildDeckForJobUseCase(
        jobRepository,
        uploadRepository
      );
      await useCase.execute({
        bl,
        exporter,
        decks: [{ cards: [{}] }] as unknown as Deck[],
        ws,
        settings,
        storage,
        id: 'page-x',
        owner: '7',
      });

      expect(storage.delete).toHaveBeenCalledWith('old-2.apkg');
      expect(uploadRepository.deleteUpload).toHaveBeenCalledWith(
        7,
        'old-2.apkg'
      );
      consoleErr.mockRestore();
    });
  });
});
