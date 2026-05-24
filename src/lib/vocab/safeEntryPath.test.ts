import path from 'path';

import {
  isSafeEntryName,
  resolveSafeEntryPath,
} from './safeEntryPath';

const BASE = '/tmp/extracted';

describe('resolveSafeEntryPath', () => {
  it('accepts a simple relative file name', () => {
    const out = resolveSafeEntryPath('chapter1.xhtml', BASE);
    expect(out).toBe(path.join(BASE, 'chapter1.xhtml'));
  });

  it('accepts a nested relative path', () => {
    const out = resolveSafeEntryPath('OEBPS/Text/chapter1.xhtml', BASE);
    expect(out).toBe(path.join(BASE, 'OEBPS', 'Text', 'chapter1.xhtml'));
  });

  it('rejects parent-traversal segments', () => {
    expect(() => resolveSafeEntryPath('../etc/passwd', BASE)).toThrow(
      /resolves outside/
    );
  });

  it('rejects nested parent-traversal segments', () => {
    expect(() =>
      resolveSafeEntryPath('OEBPS/../../../etc/passwd', BASE)
    ).toThrow(/resolves outside/);
  });

  it('rejects absolute paths', () => {
    expect(() => resolveSafeEntryPath('/etc/passwd', BASE)).toThrow(
      /absolute path/
    );
  });

  it('rejects an empty entry name', () => {
    expect(() => resolveSafeEntryPath('', BASE)).toThrow(/empty/);
  });

  it('rejects sibling-directory escape via prefix match', () => {
    // A naive `startsWith` check without `path.sep` would let
    // "extracted-evil/foo" pass when the base is "/tmp/extracted".
    expect(() =>
      resolveSafeEntryPath('../extracted-evil/foo', BASE)
    ).toThrow(/resolves outside/);
  });

  it('accepts the base directory itself (no entry name escape)', () => {
    const out = resolveSafeEntryPath('.', BASE);
    expect(out).toBe(path.resolve(BASE));
  });
});

describe('isSafeEntryName', () => {
  it('returns true for safe paths', () => {
    expect(isSafeEntryName('OEBPS/Text/chapter1.xhtml', BASE)).toBe(true);
  });

  it('returns false for traversal attempts', () => {
    expect(isSafeEntryName('../../etc/passwd', BASE)).toBe(false);
  });

  it('returns false for absolute paths', () => {
    expect(isSafeEntryName('/etc/passwd', BASE)).toBe(false);
  });
});
