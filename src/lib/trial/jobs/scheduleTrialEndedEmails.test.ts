import { scheduleTrialEndedEmails, TRIAL_ENDED_HOURLY_LIMIT } from './scheduleTrialEndedEmails';
import type { SendTrialEndedEmailsUseCase } from '../../../usecases/ops/SendTrialEndedEmailsUseCase';
import type { EventsSink } from '../../../services/events/EventsSink';

function makeUseCase(
  result = { count: 4, dryRun: false }
): jest.Mocked<Pick<SendTrialEndedEmailsUseCase, 'execute'>> {
  return { execute: jest.fn().mockResolvedValue(result) };
}

describe('scheduleTrialEndedEmails', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('runs the use case with the default hourly limit after one interval', async () => {
    const useCase = makeUseCase();
    const handle = scheduleTrialEndedEmails(
      useCase as unknown as SendTrialEndedEmailsUseCase,
      { intervalMs: 1000 }
    );

    jest.advanceTimersByTime(1000);
    await Promise.resolve();

    expect(useCase.execute).toHaveBeenCalledWith(false, TRIAL_ENDED_HOURLY_LIMIT);
    clearInterval(handle);
  });

  it('does not fire before the interval elapses', () => {
    const useCase = makeUseCase();
    const handle = scheduleTrialEndedEmails(
      useCase as unknown as SendTrialEndedEmailsUseCase,
      { intervalMs: 1000 }
    );

    jest.advanceTimersByTime(999);

    expect(useCase.execute).not.toHaveBeenCalled();
    clearInterval(handle);
  });

  it('records an email_batch_sent event with the post_trial campaign and count', async () => {
    const useCase = makeUseCase({ count: 4, dryRun: false });
    const record = jest.fn();
    const eventsSink = { record } as unknown as EventsSink;
    const handle = scheduleTrialEndedEmails(
      useCase as unknown as SendTrialEndedEmailsUseCase,
      { intervalMs: 1000, eventsSink }
    );

    jest.advanceTimersByTime(1000);
    await Promise.resolve();
    await Promise.resolve();

    expect(record).toHaveBeenCalledWith({
      name: 'email_batch_sent',
      props: { campaign: 'post_trial', count: 4 },
    });
    clearInterval(handle);
  });
});
