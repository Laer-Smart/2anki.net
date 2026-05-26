import { IErrorEventRepository } from '../../data_layer/ErrorEventRepository';

export class ResolveErrorGroupUseCase {
  constructor(private readonly repository: IErrorEventRepository) {}

  async execute(messageHash: string, resolvedBy: number | null): Promise<void> {
    await this.repository.resolveGroup(messageHash, resolvedBy);
  }
}
