import type {
  FeatureFlagWithEmail,
  IFeatureFlagsRepository,
} from '../../data_layer/FeatureFlagsRepository';

export class ListFeatureFlagsUseCase {
  constructor(private readonly repository: IFeatureFlagsRepository) {}

  async execute(): Promise<FeatureFlagWithEmail[]> {
    return this.repository.getAll();
  }
}
