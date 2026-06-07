import type { SendInactivityWarningsUseCase } from '../../../usecases/ops/SendInactivityWarningsUseCase';
import type { EventsSink } from '../../../services/events/EventsSink';
import { isOverdue, type LastRunAt } from './lastRunAt';

export const INACTIVITY_WARNING_DAILY_LIMIT = 100;
export const INACTIVITY_WARNING_INTERVAL_MS = 24 * 60 * 60 * 1000;

export const scheduleInactivityWarnings = async (
  useCase: SendInactivityWarningsUseCase,
  options: {
    intervalMs?: number;
    limit?: number;
    eventsSink?: EventsSink;
    lastRunAt?: LastRunAt;
  } = {}
): Promise<NodeJS.Timeout> => {
  const intervalMs = options.intervalMs ?? INACTIVITY_WARNING_INTERVAL_MS;
  const limit = options.limit ?? INACTIVITY_WARNING_DAILY_LIMIT;

  const tick = async () => {
    try {
      const result = await useCase.execute(false, limit);
      console.info(`[inactivity-warnings] sent ${result.count} warning(s)`);
      if (options.eventsSink != null) {
        options.eventsSink.record({
          name: 'email_batch_sent',
          props: { campaign: 'inactivity', count: result.count },
        });
      }
    } catch (error) {
      console.error('[inactivity-warnings] daily job failed:', error);
    }
  };

  if (options.lastRunAt != null) {
    const lastRun = await options.lastRunAt();
    if (isOverdue(lastRun, intervalMs, Date.now())) {
      await tick();
    }
  }

  const handle = setInterval(tick, intervalMs);
  handle.unref();
  return handle;
};
