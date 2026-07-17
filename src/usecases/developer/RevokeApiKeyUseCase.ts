import { IApiKeyRepository } from '../../data_layer/ApiKeyRepository';

export class RevokeApiKeyUseCase {
  constructor(private readonly repo: IApiKeyRepository) {}

  execute(id: number, userId: number): Promise<boolean> {
    return this.repo.revoke(id, userId);
  }
}

export default RevokeApiKeyUseCase;
