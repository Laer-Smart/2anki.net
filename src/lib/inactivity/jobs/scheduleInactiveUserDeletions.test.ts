import {
  scheduleInactiveUserDeletions,
  INACTIVE_USER_DELETION_DAILY_LIMIT,
  INACTIVE_USER_DELETION_INTERVAL_MS,
} from './scheduleInactiveUserDeletions';
import type { DeleteInactiveUsersUseCase } from '../../../usecases/ops/DeleteInactiveUsersUseCase';

function makeUseCase(
  result = { count: 3, dryRun: false }
): jest.Mocked<Pick<DeleteInactiveUsersUseCase, 'execute'>> {
  return { execute: jest.fn().mockResolvedValue(result) };
}

describe('scheduleInactiveUserDeletions', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('ticks on startup when the job has never run', async () => {
    const useCase = makeUseCase();
    const lastRunAt = jest.fn().mockResolvedValue(null);

    const handle = await scheduleInactiveUserDeletions(
      useCase as unknown as DeleteInactiveUsersUseCase,
      { intervalMs: 1000, lastRunAt }
    );

    expect(useCase.execute).toHaveBeenCalledTimes(1);
    expect(useCase.execute).toHaveBeenCalledWith(
      false,
      INACTIVE_USER_DELETION_DAILY_LIMIT
    );
    clearInterval(handle);
  });

  it('ticks on startup when the last run is older than the interval', async () => {
    const useCase = makeUseCase();
    const lastRunAt = jest.fn().mockResolvedValue(new Date(Date.now() - 2000));

    const handle = await scheduleInactiveUserDeletions(
      useCase as unknown as DeleteInactiveUsersUseCase,
      { intervalMs: 1000, lastRunAt }
    );

    expect(useCase.execute).toHaveBeenCalledTimes(1);
    clearInterval(handle);
  });

  it('does not tick on startup when the last run is within the interval', async () => {
    const useCase = makeUseCase();
    const lastRunAt = jest.fn().mockResolvedValue(new Date(Date.now() - 500));

    const handle = await scheduleInactiveUserDeletions(
      useCase as unknown as DeleteInactiveUsersUseCase,
      { intervalMs: 1000, lastRunAt }
    );

    expect(useCase.execute).not.toHaveBeenCalled();
    clearInterval(handle);
  });

  it('arms the interval after the startup check so later windows still fire', async () => {
    const useCase = makeUseCase();
    const lastRunAt = jest.fn().mockResolvedValue(new Date(Date.now() - 500));

    const handle = await scheduleInactiveUserDeletions(
      useCase as unknown as DeleteInactiveUsersUseCase,
      { intervalMs: 1000, lastRunAt }
    );

    expect(useCase.execute).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1000);
    await Promise.resolve();

    expect(useCase.execute).toHaveBeenCalledTimes(1);
    expect(useCase.execute).toHaveBeenCalledWith(
      false,
      INACTIVE_USER_DELETION_DAILY_LIMIT
    );
    clearInterval(handle);
  });

  it('respects a custom limit passed via options', async () => {
    const useCase = makeUseCase();
    const lastRunAt = jest.fn().mockResolvedValue(null);

    const handle = await scheduleInactiveUserDeletions(
      useCase as unknown as DeleteInactiveUsersUseCase,
      { intervalMs: 1000, limit: 25, lastRunAt }
    );

    expect(useCase.execute).toHaveBeenCalledWith(false, 25);
    clearInterval(handle);
  });

  it('defaults to the 24h interval', () => {
    expect(INACTIVE_USER_DELETION_INTERVAL_MS).toBe(24 * 60 * 60 * 1000);
  });
});
