import {
  scheduleInactiveUserDeletions,
  INACTIVE_USER_DELETION_DAILY_LIMIT,
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

  it('calls execute with dryRun=false and the default limit after one interval', async () => {
    const useCase = makeUseCase();
    const handle = scheduleInactiveUserDeletions(
      useCase as unknown as DeleteInactiveUsersUseCase,
      { intervalMs: 1000 }
    );

    jest.advanceTimersByTime(1000);
    await Promise.resolve();

    expect(useCase.execute).toHaveBeenCalledWith(
      false,
      INACTIVE_USER_DELETION_DAILY_LIMIT
    );
    clearInterval(handle);
  });

  it('respects a custom limit passed via options', async () => {
    const useCase = makeUseCase();
    const handle = scheduleInactiveUserDeletions(
      useCase as unknown as DeleteInactiveUsersUseCase,
      { intervalMs: 1000, limit: 25 }
    );

    jest.advanceTimersByTime(1000);
    await Promise.resolve();

    expect(useCase.execute).toHaveBeenCalledWith(false, 25);
    clearInterval(handle);
  });

  it('does not fire before the interval elapses', () => {
    const useCase = makeUseCase();
    const handle = scheduleInactiveUserDeletions(
      useCase as unknown as DeleteInactiveUsersUseCase,
      { intervalMs: 1000 }
    );

    jest.advanceTimersByTime(999);

    expect(useCase.execute).not.toHaveBeenCalled();
    clearInterval(handle);
  });
});
