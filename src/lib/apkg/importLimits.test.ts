import {
  APKG_IMPORT_NOTE_CAP_FREE,
  APKG_IMPORT_NOTE_CAP_PAID,
  getApkgImportNoteCap,
} from './importLimits';

describe('getApkgImportNoteCap', () => {
  it('returns the paid cap for paying users', () => {
    expect(getApkgImportNoteCap(true)).toBe(APKG_IMPORT_NOTE_CAP_PAID);
    expect(getApkgImportNoteCap(true)).toBe(10000);
  });

  it('returns the free cap for free users', () => {
    expect(getApkgImportNoteCap(false)).toBe(APKG_IMPORT_NOTE_CAP_FREE);
    expect(getApkgImportNoteCap(false)).toBe(1000);
  });
});
