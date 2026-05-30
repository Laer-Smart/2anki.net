import type {
  FeatureFlagWithEmail,
  IFeatureFlagsRepository,
} from '../../data_layer/FeatureFlagsRepository';
import { invalidateFeatureFlagCache } from '../../lib/featureFlags/getFeatureFlag';
import { track } from '../../services/events/track';

export class FeatureFlagNotFoundError extends Error {
  constructor(key: string) {
    super(`Feature flag not found: ${key}`);
    this.name = 'FeatureFlagNotFoundError';
  }
}

export interface SetFeatureFlagInput {
  key: string;
  value: boolean;
  userId: number;
}

export class SetFeatureFlagUseCase {
  constructor(private readonly repository: IFeatureFlagsRepository) {}

  async execute(input: SetFeatureFlagInput): Promise<FeatureFlagWithEmail> {
    const updated = await this.repository.set(
      input.key,
      input.value,
      input.userId
    );
    if (updated == null) {
      throw new FeatureFlagNotFoundError(input.key);
    }
    invalidateFeatureFlagCache(input.key);
    track('feature_flag_changed', {
      userId: input.userId,
      props: { key: input.key, value: input.value },
    });
    return updated;
  }
}
