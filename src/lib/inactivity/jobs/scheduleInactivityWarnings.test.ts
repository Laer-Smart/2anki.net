import {
  scheduleInactivityWarnings,
  INACTIVITY_WARNING_DAILY_LIMIT,
} from './scheduleInactivityWarnings';
import type { SendInactivityWarningsUseCase } from '../../../usecases/ops/SendInactivityWarningsUseCase';

function makeUseCase(
  result = { count: 3, dryRun: false }
): jest.Mocked<Pick<SendInactivityWarningsUseCase, 'execute'>> {
  return { execute: jest.fn().mockResolvedValue(result) };
}

describe('scheduleInactivityWarnings', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('calls execute with dryRun=false and the default limit after one interval', async () => {
    const useCase = makeUseCase();
    const handle = scheduleInactivityWarnings(
      useCase as unknown as SendInactivityWarningsUseCase,
      { intervalMs: 1000 }
    );

    jest.advanceTimersByTime(1000);
    await Promise.resolve();

    expect(useCase.execute).toHaveBeenCalledWith(
      false,
      INACTIVITY_WARNING_DAILY_LIMIT
    );
    clearInterval(handle);
  });

  it('respects a custom limit passed via options', async () => {
    const useCase = makeUseCase();
    const handle = scheduleInactivityWarnings(
      useCase as unknown as SendInactivityWarningsUseCase,
      { intervalMs: 1000, limit: 50 }
    );

    jest.advanceTimersByTime(1000);
    await Promise.resolve();

    expect(useCase.execute).toHaveBeenCalledWith(false, 50);
    clearInterval(handle);
  });

  it('does not fire before the interval elapses', () => {
    const useCase = makeUseCase();
    const handle = scheduleInactivityWarnings(
      useCase as unknown as SendInactivityWarningsUseCase,
      { intervalMs: 1000 }
    );

    jest.advanceTimersByTime(999);

    expect(useCase.execute).not.toHaveBeenCalled();
    clearInterval(handle);
  });
});
