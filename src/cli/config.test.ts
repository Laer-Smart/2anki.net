import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  readConfig,
  writeConfig,
  clearConfig,
  resolveApiBase,
  DEFAULT_API_BASE,
} from './config';

describe('cli config', () => {
  let dir: string;
  const origEnv = process.env.TWOANKI_CONFIG_DIR;
  const origBase = process.env.TWOANKI_API_BASE;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), '2anki-cli-'));
    process.env.TWOANKI_CONFIG_DIR = dir;
    delete process.env.TWOANKI_API_BASE;
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
    if (origEnv == null) delete process.env.TWOANKI_CONFIG_DIR;
    else process.env.TWOANKI_CONFIG_DIR = origEnv;
    if (origBase == null) delete process.env.TWOANKI_API_BASE;
    else process.env.TWOANKI_API_BASE = origBase;
  });

  it('returns an empty config when nothing is stored', () => {
    expect(readConfig()).toEqual({});
  });

  it('round-trips a written config', () => {
    writeConfig({ apiKey: 'sk_live_abc', apiBase: 'http://localhost:2020' });
    expect(readConfig()).toEqual({
      apiKey: 'sk_live_abc',
      apiBase: 'http://localhost:2020',
    });
  });

  it('writes the config file with owner-only permissions', () => {
    writeConfig({ apiKey: 'sk_live_secret' });
    const mode = fs.statSync(path.join(dir, 'config.json')).mode & 0o777;
    expect(mode).toBe(0o600);
  });

  it('clears the stored config', () => {
    writeConfig({ apiKey: 'sk_live_abc' });
    clearConfig();
    expect(readConfig()).toEqual({});
  });

  it('resolves the API base from config, env, then default', () => {
    expect(resolveApiBase({})).toBe(DEFAULT_API_BASE);
    expect(resolveApiBase({ apiBase: 'http://a' })).toBe('http://a');
    process.env.TWOANKI_API_BASE = 'http://env';
    expect(resolveApiBase({ apiBase: 'http://a' })).toBe('http://env');
  });
});
