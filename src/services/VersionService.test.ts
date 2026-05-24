import VersionService from './VersionService';

describe('VersionService', () => {
  const originalSha = process.env.GIT_SHA;

  afterEach(() => {
    if (originalSha === undefined) {
      delete process.env.GIT_SHA;
    } else {
      process.env.GIT_SHA = originalSha;
    }
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
});
