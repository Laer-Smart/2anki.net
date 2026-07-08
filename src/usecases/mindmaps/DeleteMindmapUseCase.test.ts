import { DeleteMindmapUseCase } from './DeleteMindmapUseCase';
import { MindmapRepositoryInterface } from '../../data_layer/MindmapRepository';
import { MindmapsId } from '../../data_layer/public/Mindmaps';
import { UsersId } from '../../data_layer/public/Users';
import StorageHandler from '../../lib/storage/StorageHandler';

function makeRepo(): MindmapRepositoryInterface {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findByUserId: jest.fn(),
    update: jest.fn(),
    delete: jest.fn().mockResolvedValue(undefined),
    countByUserId: jest.fn(),
  };
}

function makeStorage(keys: string[] = []): StorageHandler {
  return {
    listByPrefix: jest.fn().mockResolvedValue(keys),
    deleteObjects: jest.fn().mockResolvedValue(undefined),
    uploadFile: jest.fn(),
    getPresignedUrl: jest.fn(),
    getFileContents: jest.fn(),
    objectExists: jest.fn(),
    delete: jest.fn(),
    getContents: jest.fn(),
    uniqify: jest.fn(),
    s3: {} as never,
  } as unknown as StorageHandler;
}

const ID = 'map-uuid' as MindmapsId;
const USER = 99 as UsersId;

describe('DeleteMindmapUseCase', () => {
  it('calls listByPrefix with the correct prefix', async () => {
    const storage = makeStorage(['mindmaps/99/map-uuid/a.png']);
    const repo = makeRepo();
    const useCase = new DeleteMindmapUseCase(repo, storage);

    await useCase.execute(ID, USER);

    expect(storage.listByPrefix).toHaveBeenCalledWith('mindmaps/99/map-uuid/');
    expect(storage.deleteObjects).toHaveBeenCalledWith([
      'mindmaps/99/map-uuid/a.png',
    ]);
  });

  it('skips deleteObjects when no objects exist', async () => {
    const storage = makeStorage([]);
    const repo = makeRepo();
    const useCase = new DeleteMindmapUseCase(repo, storage);

    await useCase.execute(ID, USER);

    expect(storage.deleteObjects).not.toHaveBeenCalled();
  });

  it('still deletes from DB when S3 listByPrefix throws', async () => {
    const storage = makeStorage();
    (storage.listByPrefix as jest.Mock).mockRejectedValue(new Error('S3 down'));
    const repo = makeRepo();
    const useCase = new DeleteMindmapUseCase(repo, storage);

    await useCase.execute(ID, USER);

    expect(repo.delete).toHaveBeenCalledWith(ID, USER);
  });

  it('still deletes from DB when deleteObjects throws', async () => {
    const storage = makeStorage(['mindmaps/99/map-uuid/a.png']);
    (storage.deleteObjects as jest.Mock).mockRejectedValue(
      new Error('S3 down')
    );
    const repo = makeRepo();
    const useCase = new DeleteMindmapUseCase(repo, storage);

    await useCase.execute(ID, USER);

    expect(repo.delete).toHaveBeenCalledWith(ID, USER);
  });
});
