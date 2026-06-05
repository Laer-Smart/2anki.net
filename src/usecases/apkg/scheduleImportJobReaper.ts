import JobRepository from '../../data_layer/JobRepository';

export const IMPORT_JOB_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
export const IMPORT_REAP_INTERVAL_MS = 60 * 60 * 1000;

export function scheduleImportJobReaper(
  jobRepository: JobRepository,
  options: {
    intervalMs?: number;
    maxAgeMs?: number;
  } = {}
): NodeJS.Timeout {
  const intervalMs = options.intervalMs ?? IMPORT_REAP_INTERVAL_MS;
  const maxAgeMs = options.maxAgeMs ?? IMPORT_JOB_MAX_AGE_MS;

  const tick = async () => {
    try {
      const deleted = await jobRepository.deleteOldJobs(
        'apkg_import',
        maxAgeMs
      );
      if (deleted > 0) {
        console.info(`[import-reaper] cleaned up ${deleted} old import jobs`);
      }
    } catch (error) {
      console.error('[import-reaper] tick failed', error);
    }
  };

  return setInterval(tick, intervalMs);
}
