import { readConfig, resolveApiBase } from '../config';
import { ApiClient, ApiError } from '../apiClient';
import { info, error, warn, ui } from '../ui';

export async function whoami(): Promise<number> {
  const config = readConfig();
  if (config.apiKey == null) {
    warn('Not logged in. Run `2anki login` to connect an API key.');
    return 1;
  }

  const client = new ApiClient(config);
  try {
    // Probe a key-authed endpoint to confirm the stored key still works.
    const jobs = await client.listJobs();
    info(`${ui.bold('Connected to')} ${resolveApiBase(config)}`);
    info(`${jobs.length} recent job${jobs.length === 1 ? '' : 's'}.`);
    return 0;
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.status === 401) {
        error('Your API key is no longer valid. Run `2anki login` again.');
        return 1;
      }
      error(e.message);
      return 1;
    }
    error('Could not reach 2anki. Check your connection and try again.');
    return 1;
  }
}
