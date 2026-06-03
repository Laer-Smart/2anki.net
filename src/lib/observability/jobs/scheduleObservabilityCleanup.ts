import type { IObservabilityRepository } from '../../../data_layer/ObservabilityRepository';

export const OBSERVABILITY_CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

export const OBSERVABILITY_RETENTION_DAYS = 30;

type CleanupRepository = Pick<IObservabilityRepository, 'deleteOlderThan'>;

export const scheduleObservabilityCleanup = (
  repo: CleanupRepository,
  options: { intervalMs?: number } = {}
): NodeJS.Timeout => {
  const intervalMs = options.intervalMs ?? OBSERVABILITY_CLEANUP_INTERVAL_MS;

  const tick = async () => {
    try {
      const { requestLogs, outboundCallLogs } = await repo.deleteOlderThan(
        OBSERVABILITY_RETENTION_DAYS
      );
      console.info(
        `[observability-cleanup] completed — deleted ${requestLogs} request log(s) and ${outboundCallLogs} outbound call log(s) older than ${OBSERVABILITY_RETENTION_DAYS} days`
      );
    } catch (error) {
      console.error('[observability-cleanup] failed:', error);
    }
  };

  const handle = setInterval(tick, intervalMs);
  handle.unref();
  return handle;
};
