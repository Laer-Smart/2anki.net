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
    const keys = await client.listKeys();
    info(`${ui.bold('Connected to')} ${resolveApiBase(config)}`);
    info(
      `${keys.length} API key${keys.length === 1 ? '' : 's'} on this account.`
    );
    for (const key of keys) {
      info(`  ${ui.dim(key.prefix + '…')}  ${key.name}`);
    }
    return 0;
  } catch (e) {
    if (e instanceof ApiError) {
      error(e.message);
      return 1;
    }
    error('Could not reach 2anki. Check your connection and try again.');
    return 1;
  }
}
