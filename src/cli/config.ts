import fs from 'fs';
import os from 'os';
import path from 'path';

export const DEFAULT_API_BASE = 'https://2anki.net';

export interface CliConfig {
  apiKey?: string;
  apiBase?: string;
}

export function configDir(): string {
  return process.env.TWOANKI_CONFIG_DIR ?? path.join(os.homedir(), '.2anki');
}

export function configPath(): string {
  return path.join(configDir(), 'config.json');
}

export function readConfig(): CliConfig {
  try {
    const raw = fs.readFileSync(configPath(), 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (parsed == null || typeof parsed !== 'object') {
      return {};
    }
    return parsed as CliConfig;
  } catch {
    return {};
  }
}

export function writeConfig(config: CliConfig): void {
  const dir = configDir();
  fs.mkdirSync(dir, { recursive: true });
  const file = configPath();
  fs.writeFileSync(file, `${JSON.stringify(config, null, 2)}\n`, {
    mode: 0o600,
  });
  // Tighten perms even if the file already existed with looser bits.
  try {
    fs.chmodSync(file, 0o600);
  } catch {
    // best-effort on platforms without POSIX perms
  }
}

export function clearConfig(): void {
  try {
    fs.rmSync(configPath());
  } catch {
    // already gone
  }
}

export function resolveApiBase(config: CliConfig): string {
  return process.env.TWOANKI_API_BASE ?? config.apiBase ?? DEFAULT_API_BASE;
}
