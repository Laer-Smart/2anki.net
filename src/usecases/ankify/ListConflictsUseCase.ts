import { AnkifySyncConflict } from '../../entities/ankify';
import { AnkifySyncConflictsRepositoryInterface } from '../../data_layer/ankify/AnkifySyncConflictsRepository';

export class ListConflictsUseCase {
  constructor(private readonly repo: AnkifySyncConflictsRepositoryInterface) {}

  execute(
    owner: number,
    options: { status?: string } = {}
  ): Promise<AnkifySyncConflict[]> {
    return this.repo.listByOwner(owner, options);
  }
}
