import { isSafeZipEntryName } from './isSafeZipEntryName';

describe('isSafeZipEntryName', () => {
  it.each([
    'safe.html',
    'notes.md',
    'Private & Shared/SLE/page.html',
    'Private & Shared/SLE/image.png',
    'deck/sub/deeper/card.html',
  ])('accepts legitimate entry %s', (name) => {
    expect(isSafeZipEntryName(name)).toBe(true);
  });

  it.each([
    '/etc/passwd.html',
    '../escape.html',
    '../../../../tmp/evil.html',
    'a/../../escape.html',
    'deck/../../escape.html',
    'C:\\Windows\\evil.html',
    '..\\..\\evil.html',
  ])('rejects traversal or absolute entry %s', (name) => {
    expect(isSafeZipEntryName(name)).toBe(false);
  });
});
