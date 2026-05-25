import type { SendTrialEndedEmailsUseCase } from '../../../usecases/ops/SendTrialEndedEmailsUseCase';
import type { EventsSink } from '../../../services/events/EventsSink';

export const TRIAL_ENDED_HOURLY_LIMIT = 200;
export const TRIAL_ENDED_INTERVAL_MS = 60 * 60 * 1000;

export const scheduleTrialEndedEmails = (
  useCase: SendTrialEndedEmailsUseCase,
  options: { intervalMs?: number; limit?: number; eventsSink?: EventsSink } = {}
): NodeJS.Timeout => {
  const intervalMs = options.intervalMs ?? TRIAL_ENDED_INTERVAL_MS;
  const limit = options.limit ?? TRIAL_ENDED_HOURLY_LIMIT;

  const tick = async () => {
    try {
      const result = await useCase.execute(false, limit);
      console.info(`[trial-ended] sent ${result.count} email(s)`);
      if (options.eventsSink != null) {
        options.eventsSink.record({
          name: 'email_batch_sent',
          props: { campaign: 'post_trial', count: result.count },
        });
      }
    } catch (error) {
      console.error('[trial-ended] hourly job failed:', error);
    }
  };

  const handle = setInterval(tick, intervalMs);
  handle.unref();
  return handle;
};
