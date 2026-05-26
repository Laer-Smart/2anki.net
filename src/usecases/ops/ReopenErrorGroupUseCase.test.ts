import { ReopenErrorGroupUseCase } from './ReopenErrorGroupUseCase';
import { IErrorEventRepository } from '../../data_layer/ErrorEventRepository';

function makeRepo(): IErrorEventRepository {
  return {
    insert: jest.fn(),
    existsWithinWindow: jest.fn(async () => false),
    listGroups: jest.fn(async () => []),
    countGroups: jest.fn(async () => 0),
    resolveGroup: jest.fn(async () => {}),
    reopenGroup: jest.fn(async () => {}),
  };
}

describe('ReopenErrorGroupUseCase', () => {
  it('delegates to the repository with the hash', async () => {
    const repo = makeRepo();
    const useCase = new ReopenErrorGroupUseCase(repo);

    await useCase.execute('c'.repeat(64));

    expect(repo.reopenGroup).toHaveBeenCalledWith('c'.repeat(64));
  });
});
