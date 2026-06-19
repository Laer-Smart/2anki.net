import VersionService from './VersionService';

describe('VersionService', () => {
  const originalSha = process.env.GIT_SHA;
  const originalRelease = process.env.RELEASE;

  const restore = (key: 'GIT_SHA' | 'RELEASE', value: string | undefined) => {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  };

  afterEach(() => {
    restore('GIT_SHA', originalSha);
    restore('RELEASE', originalRelease);
  });

  it('returns package.json version + GIT_SHA from env', () => {
    process.env.GIT_SHA = 'a1b2c3d4e5f6';
    const result = new VersionService().getVersion();
    expect(result.sha).toBe('a1b2c3d4e5f6');
    expect(result.version).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('falls back to "unknown" when GIT_SHA is unset (local dev)', () => {
    delete process.env.GIT_SHA;
    expect(new VersionService().getVersion().sha).toBe('unknown');
  });

  it('reports the TrunkVer from RELEASE as the release', () => {
    process.env.RELEASE = '20260619125336.0.0-g4579478f93dc-20652898919-1';
    expect(new VersionService().getVersion().release).toBe(
      '20260619125336.0.0-g4579478f93dc-20652898919-1'
    );
  });
});
