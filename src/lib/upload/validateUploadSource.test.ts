import { validateUploadSource } from './validateUploadSource';

describe('validateUploadSource', () => {
  it.each(['app', 'web', 'dropbox', 'google_drive'])(
    'returns %s unchanged when it is on the allowlist',
    (value) => {
      expect(validateUploadSource(value)).toBe(value);
    }
  );

  it('returns null for an unknown string', () => {
    expect(validateUploadSource('mobile')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(validateUploadSource('')).toBeNull();
  });

  it('returns null for non-string input', () => {
    expect(validateUploadSource(undefined)).toBeNull();
    expect(validateUploadSource(null)).toBeNull();
    expect(validateUploadSource(42)).toBeNull();
    expect(validateUploadSource(['app'])).toBeNull();
    expect(validateUploadSource({ source: 'app' })).toBeNull();
  });

  it('does not trim or normalize casing before matching', () => {
    expect(validateUploadSource(' app ')).toBeNull();
    expect(validateUploadSource('App')).toBeNull();
  });
});
