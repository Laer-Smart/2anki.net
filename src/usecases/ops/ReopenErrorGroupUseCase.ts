import { IErrorEventRepository } from '../../data_layer/ErrorEventRepository';

export class ReopenErrorGroupUseCase {
  constructor(private readonly repository: IErrorEventRepository) {}

  async execute(messageHash: string): Promise<void> {
    await this.repository.reopenGroup(messageHash);
  }
}
