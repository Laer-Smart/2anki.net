import { DeleteInactiveUsersUseCase, IInactiveUserDeleter } from './DeleteInactiveUsersUseCase';
import { InMemoryInactivityEmailRepository } from '../../data_layer/InactivityEmailRepository';

function makeDeleter(overrides: Partial<IInactiveUserDeleter> = {}): jest.Mocked<IInactiveUserDeleter> {
  return {
    deleteUser: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as jest.Mocked<IInactiveUserDeleter>;
}

describe('DeleteInactiveUsersUseCase', () => {
  let repo: InMemoryInactivityEmailRepository;

  beforeEach(() => {
    repo = new InMemoryInactivityEmailRepository();
  });

  describe('dry run', () => {
    it('returns candidate count without deleting anyone', async () => {
      repo.seedUsersToDelete([
        { id: 1, email: 'alice@example.com' },
        { id: 2, email: 'bob@example.com' },
      ]);
      const deleter = makeDeleter();
      const useCase = new DeleteInactiveUsersUseCase(repo, deleter);

      const result = await useCase.execute(true);

      expect(result).toEqual({ count: 2, dryRun: true });
      expect(deleter.deleteUser).not.toHaveBeenCalled();
    });

    it('respects limit when counting candidates', async () => {
      repo.seedUsersToDelete([
        { id: 1, email: 'alice@example.com' },
        { id: 2, email: 'bob@example.com' },
        { id: 3, email: 'carol@example.com' },
      ]);
      const useCase = new DeleteInactiveUsersUseCase(repo, makeDeleter());

      const result = await useCase.execute(true, 1);

      expect(result).toEqual({ count: 1, dryRun: true });
    });

    it('returns zero when no candidates exist', async () => {
      const useCase = new DeleteInactiveUsersUseCase(repo, makeDeleter());

      const result = await useCase.execute(true);

      expect(result).toEqual({ count: 0, dryRun: true });
    });
  });

  describe('live delete', () => {
    it('deletes each candidate by id and counts successes', async () => {
      repo.seedUsersToDelete([
        { id: 1, email: 'alice@example.com' },
        { id: 2, email: 'bob@example.com' },
      ]);
      const deleter = makeDeleter();
      const useCase = new DeleteInactiveUsersUseCase(repo, deleter);

      const result = await useCase.execute(false);

      expect(result).toEqual({ count: 2, dryRun: false });
      expect(deleter.deleteUser).toHaveBeenCalledWith('1');
      expect(deleter.deleteUser).toHaveBeenCalledWith('2');
      expect(deleter.deleteUser).toHaveBeenCalledTimes(2);
    });

    it('continues deleting remaining users when one deletion fails', async () => {
      repo.seedUsersToDelete([
        { id: 1, email: 'alice@example.com' },
        { id: 2, email: 'bob@example.com' },
      ]);
      const deleter = makeDeleter({
        deleteUser: jest
          .fn()
          .mockRejectedValueOnce(new Error('FK violation'))
          .mockResolvedValueOnce(undefined),
      });
      const useCase = new DeleteInactiveUsersUseCase(repo, deleter);

      const result = await useCase.execute(false);

      expect(result.count).toBe(1);
      expect(deleter.deleteUser).toHaveBeenCalledTimes(2);
    });

    it('deletes only up to the limit', async () => {
      repo.seedUsersToDelete([
        { id: 1, email: 'alice@example.com' },
        { id: 2, email: 'bob@example.com' },
        { id: 3, email: 'carol@example.com' },
      ]);
      const deleter = makeDeleter();
      const useCase = new DeleteInactiveUsersUseCase(repo, deleter);

      const result = await useCase.execute(false, 2);

      expect(result).toEqual({ count: 2, dryRun: false });
      expect(deleter.deleteUser).toHaveBeenCalledTimes(2);
    });

    it('returns zero when no candidates exist', async () => {
      const useCase = new DeleteInactiveUsersUseCase(repo, makeDeleter());

      const result = await useCase.execute(false);

      expect(result).toEqual({ count: 0, dryRun: false });
    });
  });
});
