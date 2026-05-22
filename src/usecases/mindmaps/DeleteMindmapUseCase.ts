import { MindmapRepositoryInterface } from '../../data_layer/MindmapRepository';
import { MindmapsId } from '../../data_layer/public/Mindmaps';
import { UsersId } from '../../data_layer/public/Users';

export class DeleteMindmapUseCase {
  constructor(private readonly repo: MindmapRepositoryInterface) {}

  execute(id: MindmapsId, userId: UsersId): Promise<void> {
    return this.repo.delete(id, userId);
  }
}
