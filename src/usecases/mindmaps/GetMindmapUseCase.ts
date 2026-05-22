import { MindmapRepositoryInterface } from '../../data_layer/MindmapRepository';
import Mindmaps, { MindmapsId } from '../../data_layer/public/Mindmaps';
import { UsersId } from '../../data_layer/public/Users';

export class GetMindmapUseCase {
  constructor(private readonly repo: MindmapRepositoryInterface) {}

  async execute(id: MindmapsId, userId: UsersId): Promise<Mindmaps | null> {
    return this.repo.findById(id, userId);
  }
}
