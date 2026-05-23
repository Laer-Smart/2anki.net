import StorageHandler from '../../lib/storage/StorageHandler';
import { MindmapRepositoryInterface } from '../../data_layer/MindmapRepository';
import { MindmapsId } from '../../data_layer/public/Mindmaps';
import { UsersId } from '../../data_layer/public/Users';

export class DeleteMindmapUseCase {
  constructor(
    private readonly repo: MindmapRepositoryInterface,
    private readonly storage: StorageHandler
  ) {}

  async execute(id: MindmapsId, userId: UsersId): Promise<void> {
    const prefix = `mindmaps/${userId}/${id}/`;
    try {
      const keys = await this.storage.listByPrefix(prefix);
      if (keys.length > 0) {
        await this.storage.deleteObjects(keys);
      }
    } catch (err) {
      console.error('S3 cleanup failed for mindmap', id, err);
    }
    return this.repo.delete(id, userId);
  }
}
