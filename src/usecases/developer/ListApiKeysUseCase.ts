import {
  IApiKeyRepository,
  ApiKeyListItem,
} from '../../data_layer/ApiKeyRepository';

export class ListApiKeysUseCase {
  constructor(private readonly repo: IApiKeyRepository) {}

  execute(userId: number): Promise<ApiKeyListItem[]> {
    return this.repo.listByUser(userId);
  }
}

export default ListApiKeysUseCase;
