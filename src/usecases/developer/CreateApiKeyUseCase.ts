import {
  IApiKeyRepository,
  ApiKeyListItem,
} from '../../data_layer/ApiKeyRepository';
import { generateApiKey } from '../../lib/apiKeys/apiKeyToken';

const MAX_NAME_LENGTH = 120;
const MAX_KEYS_PER_USER = 20;

export interface CreatedApiKey extends ApiKeyListItem {
  /** The full secret — returned exactly once, never persisted. */
  secret: string;
}

export class ApiKeyLimitReachedError extends Error {
  constructor() {
    super('You have reached the maximum number of API keys.');
    this.name = 'ApiKeyLimitReachedError';
  }
}

export class InvalidApiKeyNameError extends Error {
  constructor() {
    super('A key name is required.');
    this.name = 'InvalidApiKeyNameError';
  }
}

export class CreateApiKeyUseCase {
  constructor(private readonly repo: IApiKeyRepository) {}

  async execute(userId: number, rawName: unknown): Promise<CreatedApiKey> {
    if (typeof rawName !== 'string' || rawName.trim().length === 0) {
      throw new InvalidApiKeyNameError();
    }
    const name = rawName.trim().slice(0, MAX_NAME_LENGTH);

    const existing = await this.repo.listByUser(userId);
    if (existing.length >= MAX_KEYS_PER_USER) {
      throw new ApiKeyLimitReachedError();
    }

    const generated = generateApiKey();
    const created = await this.repo.create({
      user_id: userId,
      name,
      key_hash: generated.hash,
      prefix: generated.prefix,
    });
    return { ...created, secret: generated.raw };
  }
}

export default CreateApiKeyUseCase;
