import type { DeleteInactiveUsersUseCase } from '../../../usecases/ops/DeleteInactiveUsersUseCase';
import type { EventsSink } from '../../../services/events/EventsSink';
import { isOverdue, type LastRunAt } from './lastRunAt';

export const INACTIVE_USER_DELETION_DAILY_LIMIT = 100;
export const INACTIVE_USER_DELETION_INTERVAL_MS = 24 * 60 * 60 * 1000;

export const scheduleInactiveUserDeletions = async (
  useCase: DeleteInactiveUsersUseCase,
  options: {
    intervalMs?: number;
    limit?: number;
    eventsSink?: EventsSink;
    lastRunAt?: LastRunAt;
  } = {}
): Promise<NodeJS.Timeout> => {
  const intervalMs = options.intervalMs ?? INACTIVE_USER_DELETION_INTERVAL_MS;
  const limit = options.limit ?? INACTIVE_USER_DELETION_DAILY_LIMIT;

  const tick = async () => {
    try {
      const result = await useCase.execute(false, limit);
      console.info(
        `[inactivity-deletions] deleted ${result.count} inactive account(s)`
      );
      if (options.eventsSink != null) {
        options.eventsSink.record({
          name: 'inactive_users_deleted',
          props: { count: result.count },
        });
      }
    } catch (error) {
      console.error('[inactivity-deletions] daily job failed:', error);
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
