import { readConfig, writeConfig, resolveApiBase } from '../config';
import { ApiClient, ApiError } from '../apiClient';
import { prompt, openBrowser } from '../prompt';
import { info, success, error, ui } from '../ui';

const API_KEY_PREFIX = 'sk_live_';

function looksLikeApiKey(value: string): boolean {
  return (
    value.startsWith(API_KEY_PREFIX) && value.length > API_KEY_PREFIX.length
  );
}

export interface LoginOptions {
  key?: string;
}

export async function login(options: LoginOptions = {}): Promise<number> {
  const config = readConfig();
  const base = resolveApiBase(config);
  const keysUrl = `${base.replace(/\/$/, '')}/developers`;

  let key = options.key;
  if (key == null) {
    info(`Opening ${ui.cyan(keysUrl)} to create an API key.`);
    info(
      ui.dim(
        'On the Developers page, create a key and copy it. It is shown only once.'
      )
    );
    openBrowser(keysUrl);
    key = await prompt('Paste your API key: ');
  }

  if (!looksLikeApiKey(key)) {
    error('That does not look like a 2anki API key (expected sk_live_…).');
    return 1;
  }

  const next = { ...config, apiKey: key };
  const client = new ApiClient(next);
  try {
    await client.listKeys();
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.status === 403) {
        error(
          'The CLI is invite-only while under development. Request access at ' +
            `${base.replace(/\/$/, '')}/developers`
        );
        return 1;
      }
      error(`Could not verify the key: ${e.message}`);
      return 1;
    }
    error('Could not reach 2anki. Check your connection and try again.');
    return 1;
  }

  writeConfig(next);
  success('Logged in. Your key is stored in ~/.2anki/config.json.');
  return 0;
}
