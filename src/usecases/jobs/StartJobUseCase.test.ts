import { StartJobUseCase } from './StartJobUseCase';
import JobRepository from '../../data_layer/JobRepository';

describe('StartJobUseCase', () => {
  function makeRepo(
    overrides: Partial<{
      findJobById: jest.Mock;
      updateJobStatus: jest.Mock;
      restartJob: jest.Mock;
    }> = {}
  ): JobRepository {
    return {
      findJobById: jest.fn(),
      updateJobStatus: jest
        .fn()
        .mockResolvedValue({ id: 1, status: 'started' }),
      restartJob: jest.fn().mockResolvedValue({ id: 1, status: 'started' }),
      ...overrides,
    } as unknown as JobRepository;
  }

  it('throws when the job is not found', async () => {
    const repo = makeRepo({ findJobById: jest.fn().mockResolvedValue(null) });
    const usecase = new StartJobUseCase(repo);

    await expect(usecase.execute({ id: 'p1', owner: 'u1' })).rejects.toThrow(
      'Job not found'
    );
  });

  it('returns the row untouched when status is cancelled', async () => {
    const cancelled = { id: 1, status: 'cancelled' };
    const updateJobStatus = jest.fn();
    const restartJob = jest.fn();
    const repo = makeRepo({
      findJobById: jest.fn().mockResolvedValue(cancelled),
      updateJobStatus,
      restartJob,
    });
    const usecase = new StartJobUseCase(repo);

    const result = await usecase.execute({ id: 'p1', owner: 'u1' });

    expect(result).toBe(cancelled);
    expect(updateJobStatus).not.toHaveBeenCalled();
    expect(restartJob).not.toHaveBeenCalled();
  });

  it.each(['done', 'failed', 'interrupted'])(
    'dispatches to restartJob when status is terminal (%s)',
    async (status) => {
      const updateJobStatus = jest.fn();
      const restartJob = jest
        .fn()
        .mockResolvedValue({ id: 1, status: 'started' });
      const repo = makeRepo({
        findJobById: jest.fn().mockResolvedValue({ id: 1, status }),
        updateJobStatus,
        restartJob,
      });
      const usecase = new StartJobUseCase(repo);

      await usecase.execute({ id: 'p1', owner: 'u1' });

      expect(restartJob).toHaveBeenCalledWith('p1', 'u1');
      expect(updateJobStatus).not.toHaveBeenCalled();
    }
  );

  it('uses updateJobStatus for a fresh (non-terminal) row', async () => {
    const updateJobStatus = jest
      .fn()
      .mockResolvedValue({ id: 1, status: 'started' });
    const restartJob = jest.fn();
    const repo = makeRepo({
      findJobById: jest.fn().mockResolvedValue({ id: 1, status: 'started' }),
      updateJobStatus,
      restartJob,
    });
    const usecase = new StartJobUseCase(repo);

    await usecase.execute({ id: 'p1', owner: 'u1' });

    expect(updateJobStatus).toHaveBeenCalledWith('p1', 'u1', 'started', '');
    expect(restartJob).not.toHaveBeenCalled();
  });

  it('returns the existing job when restartJob yields undefined (lock lost to concurrent restart)', async () => {
    const existingJob = { id: 1, status: 'done' };
    const restartJob = jest.fn().mockResolvedValue(undefined);
    const findJobById = jest.fn().mockResolvedValue(existingJob);
    const repo = makeRepo({ findJobById, restartJob });
    const usecase = new StartJobUseCase(repo);

    const result = await usecase.execute({ id: 'p1', owner: 'u1' });

    expect(restartJob).toHaveBeenCalledWith('p1', 'u1');
    expect(result).toBe(existingJob);
  });
});
