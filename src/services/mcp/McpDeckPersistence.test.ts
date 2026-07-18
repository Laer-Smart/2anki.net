import { McpDeckPersistence } from './McpDeckPersistence';
import type JobRepository from '../../data_layer/JobRepository';
import type { IUploadRepository } from '../../data_layer/UploadRespository';
import type StorageHandler from '../../lib/storage/StorageHandler';

describe('McpDeckPersistence', () => {
  it('creates a done job, uploads the bytes, and records the upload row', async () => {
    const create = jest.fn(async () => undefined);
    const updateJobStatus = jest.fn(async () => ({}) as never);
    const jobRepository = {
      create,
      updateJobStatus,
    } as unknown as JobRepository;

    const insertConvertedDeck = jest.fn(async () => ({}) as never);
    const uploadRepository = {
      insertConvertedDeck,
    } as unknown as IUploadRepository;

    const uniqify = jest.fn(() => 'owner-9-1700-deck.apkg');
    const uploadFile = jest.fn(async () => undefined);
    const storage = { uniqify, uploadFile } as unknown as StorageHandler;

    const persistence = new McpDeckPersistence(
      jobRepository,
      uploadRepository,
      storage
    );
    const bytes = Buffer.from('APKG');
    const key = await persistence.persist('9', 'obj-1', 'Pharmacology', bytes);

    expect(key).toBe('owner-9-1700-deck.apkg');
    expect(create).toHaveBeenCalledWith('obj-1', '9', 'Pharmacology', 'mcp');
    expect(updateJobStatus).toHaveBeenCalledWith('obj-1', '9', 'done', '');
    expect(uploadFile).toHaveBeenCalledWith('owner-9-1700-deck.apkg', bytes);
    expect(insertConvertedDeck).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: 9,
        object_id: 'obj-1',
        key: 'owner-9-1700-deck.apkg',
        filename: 'Pharmacology',
      })
    );
  });
});
