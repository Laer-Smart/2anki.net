import { IUploadRepository } from '../../data_layer/UploadRespository';
import StorageHandler from '../../lib/storage/StorageHandler';

export interface SaveNativeDeckInput {
  owner: number;
  filename: string;
  apkg: Buffer;
  sizeMb: number;
  dedupeKey: string | null;
}

export interface SavedNativeDeck {
  key: string;
  filename: string;
  size_mb: number;
}

export class SaveNativeDeckUseCase {
  constructor(
    private readonly uploadRepository: IUploadRepository,
    private readonly storage: StorageHandler
  ) {}

  async execute(input: SaveNativeDeckInput): Promise<SavedNativeDeck> {
    if (input.dedupeKey != null) {
      const existing = await this.uploadRepository.findByOwnerAndDedupeKey(
        input.owner,
        input.dedupeKey
      );
      if (existing != null) {
        return {
          key: existing.key,
          filename: existing.filename ?? input.filename,
          size_mb: existing.size_mb ?? input.sizeMb,
        };
      }
    }

    const key = this.storage.uniqify(
      input.filename,
      String(input.owner),
      200,
      'apkg'
    );
    await this.storage.uploadFile(key, input.apkg);

    try {
      const row = await this.uploadRepository.insertNativeDeck({
        owner: input.owner,
        key,
        filename: input.filename,
        size_mb: input.sizeMb,
        dedupe_key: input.dedupeKey,
      });
      return {
        key: row.key,
        filename: row.filename ?? input.filename,
        size_mb: row.size_mb ?? input.sizeMb,
      };
    } catch (error) {
      await this.storage.delete(key);
      throw error;
    }
  }
}
