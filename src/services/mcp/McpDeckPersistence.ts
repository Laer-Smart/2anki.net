import JobRepository from '../../data_layer/JobRepository';
import { IUploadRepository } from '../../data_layer/UploadRespository';
import StorageHandler from '../../lib/storage/StorageHandler';
import { DECK_NAME_SUFFIX } from '../../lib/anki/format';
import { BytesToMegaBytes } from '../../lib/misc/file';

export interface DeckPersistence {
  persist(
    owner: string,
    objectId: string,
    title: string,
    bytes: Buffer
  ): Promise<string>;
}

export class McpDeckPersistence implements DeckPersistence {
  constructor(
    private readonly jobRepository: JobRepository,
    private readonly uploadRepository: IUploadRepository,
    private readonly storage: StorageHandler
  ) {}

  async persist(
    owner: string,
    objectId: string,
    title: string,
    bytes: Buffer
  ): Promise<string> {
    await this.jobRepository.create(objectId, owner, title, 'mcp');
    await this.jobRepository.updateJobStatus(objectId, owner, 'done', '');

    const key = this.storage.uniqify(objectId, owner, 200, DECK_NAME_SUFFIX);
    await this.storage.uploadFile(key, bytes);
    await this.uploadRepository.insertConvertedDeck({
      owner: Number(owner),
      object_id: objectId,
      key,
      filename: title,
      size_mb: BytesToMegaBytes(bytes.byteLength),
    });
    return key;
  }
}
