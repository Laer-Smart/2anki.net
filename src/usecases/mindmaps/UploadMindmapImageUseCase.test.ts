import { UploadMindmapImageUseCase, MindmapImageTooLargeError, MindmapImageTypeError } from './UploadMindmapImageUseCase';
import StorageHandler from '../../lib/storage/StorageHandler';

const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

function makeStorage(overrides: Partial<StorageHandler> = {}): StorageHandler {
  return {
    uploadFile: jest.fn().mockResolvedValue(undefined),
    getPresignedUrl: jest.fn().mockResolvedValue('https://spaces.example.com/presigned'),
    getFileContents: jest.fn(),
    objectExists: jest.fn(),
    listByPrefix: jest.fn(),
    deleteObjects: jest.fn(),
    delete: jest.fn(),
    getContents: jest.fn(),
    uniqify: jest.fn(),
    s3: {} as never,
    ...overrides,
  } as unknown as StorageHandler;
}

describe('UploadMindmapImageUseCase', () => {
  it('accepts a PNG buffer and calls uploadFile with the expected key prefix', async () => {
    const storage = makeStorage();
    const useCase = new UploadMindmapImageUseCase(storage);

    const result = await useCase.execute({
      userId: '42',
      mapId: 'map-1',
      file: { buffer: TINY_PNG, mimetype: 'image/png', size: TINY_PNG.length },
    });

    expect(result.s3Key).toMatch(/^mindmaps\/42\/map-1\/.+\.png$/);
    expect(result.presignedUrl).toBe('https://spaces.example.com/presigned');
    expect(result.width).toBe(1);
    expect(result.height).toBe(1);
    expect(storage.uploadFile).toHaveBeenCalledWith(result.s3Key, TINY_PNG);
  });

  it('rejects an SVG file', async () => {
    const storage = makeStorage();
    const useCase = new UploadMindmapImageUseCase(storage);
    const svgBuf = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>');

    await expect(
      useCase.execute({
        userId: '42',
        mapId: 'map-1',
        file: { buffer: svgBuf, mimetype: 'image/svg+xml', size: svgBuf.length },
      })
    ).rejects.toBeInstanceOf(MindmapImageTypeError);

    expect(storage.uploadFile).not.toHaveBeenCalled();
  });

  it('rejects a file exceeding 5 MB', async () => {
    const storage = makeStorage();
    const useCase = new UploadMindmapImageUseCase(storage);
    const big = Buffer.alloc(5 * 1024 * 1024 + 1);

    await expect(
      useCase.execute({
        userId: '42',
        mapId: 'map-1',
        file: { buffer: big, mimetype: 'image/png', size: big.length },
      })
    ).rejects.toBeInstanceOf(MindmapImageTooLargeError);

    expect(storage.uploadFile).not.toHaveBeenCalled();
  });

  it('returns s3Key without writing to disk', async () => {
    const storage = makeStorage();
    const useCase = new UploadMindmapImageUseCase(storage);

    const result = await useCase.execute({
      userId: '7',
      mapId: 'abc',
      file: { buffer: TINY_PNG, mimetype: 'image/jpeg', size: TINY_PNG.length },
    });

    expect(result.s3Key).toMatch(/^mindmaps\/7\/abc\/.+\.jpg$/);
  });
});
