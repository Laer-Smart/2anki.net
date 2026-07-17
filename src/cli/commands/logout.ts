import { readConfig, writeConfig } from '../config';
import { success, info } from '../ui';

export function logout(): number {
  const config = readConfig();
  if (config.apiKey == null) {
    info('You are not logged in.');
    return 0;
  }
  const { apiKey: _removed, ...rest } = config;
  writeConfig(rest);
  success('Logged out. The stored key was removed from this machine.');
  return 0;
}
