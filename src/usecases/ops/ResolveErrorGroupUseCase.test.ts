import { ResolveErrorGroupUseCase } from './ResolveErrorGroupUseCase';
import { IErrorEventRepository } from '../../data_layer/ErrorEventRepository';

function makeRepo(): IErrorEventRepository {
  return {
    insert: jest.fn(),
    existsWithinWindow: jest.fn(async () => false),
    listGroups: jest.fn(async () => []),
    countGroups: jest.fn(async () => 0),
    latestSamples: jest.fn(async () => []),
    resolveGroup: jest.fn(async () => {}),
    reopenGroup: jest.fn(async () => {}),
  };
}

describe('ResolveErrorGroupUseCase', () => {
  it('delegates to the repository with the hash and resolver id', async () => {
    const repo = makeRepo();
    const useCase = new ResolveErrorGroupUseCase(repo);

    await useCase.execute('a'.repeat(64), 42);

    expect(repo.resolveGroup).toHaveBeenCalledWith('a'.repeat(64), 42);
  });

  it('passes a null resolver through unchanged', async () => {
    const repo = makeRepo();
    const useCase = new ResolveErrorGroupUseCase(repo);

    await useCase.execute('b'.repeat(64), null);

    expect(repo.resolveGroup).toHaveBeenCalledWith('b'.repeat(64), null);
  });
});
