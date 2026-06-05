import type { DeleteInactiveUsersUseCase } from '../../../usecases/ops/DeleteInactiveUsersUseCase';
import type { EventsSink } from '../../../services/events/EventsSink';

export const INACTIVE_USER_DELETION_DAILY_LIMIT = 100;
export const INACTIVE_USER_DELETION_INTERVAL_MS = 24 * 60 * 60 * 1000;

export const scheduleInactiveUserDeletions = (
  useCase: DeleteInactiveUsersUseCase,
  options: { intervalMs?: number; limit?: number; eventsSink?: EventsSink } = {}
): NodeJS.Timeout => {
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

  const handle = setInterval(tick, intervalMs);
  handle.unref();
  return handle;
};
