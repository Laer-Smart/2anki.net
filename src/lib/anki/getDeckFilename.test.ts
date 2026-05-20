import Package from '../parser/Package';
import getDeckFilename from './getDeckFilename';

test('appends missing .apkg extension', () => {
  expect(getDeckFilename('foo')).toEqual('foo.apkg');
});

test("does not append .apkg extension if it's already there", () => {
  expect(getDeckFilename('foo.apkg')).toEqual('foo.apkg');
});

test("uses package name if it's available", () => {
  expect(getDeckFilename(new Package('foo'))).toEqual('foo.apkg');
});

test('replaces forward slashes in the name with dashes', () => {
  expect(getDeckFilename('Red Flags / Urgent Referral Criteria')).toEqual(
    'Red Flags - Urgent Referral Criteria.apkg'
  );
});

test('replaces backslashes with dashes', () => {
  expect(getDeckFilename('a\\b\\c')).toEqual('a-b-c.apkg');
});

test('replaces null bytes with dashes', () => {
  expect(getDeckFilename('a\0b')).toEqual('a-b.apkg');
});

test('truncates long German quiz heading to a safe filename under 200 bytes', () => {
  const longTitle =
    'Engramm-Quiz: Welche der folgenden Aussagen über die synaptische Plastizität ist korrekt? ' +
    'A) LTP erhöht die Anzahl der AMPA-Rezeptoren B) LTD verstärkt die synaptische Übertragung ' +
    'C) Calcium spielt keine Rolle D) NMDA-Rezeptoren sind nicht beteiligt';
  const result = getDeckFilename(longTitle);
  expect(result.endsWith('.apkg')).toBe(true);
  expect(Buffer.byteLength(result, 'utf8')).toBeLessThanOrEqual(200);
  expect(result).not.toContain('�');
});

test('truncates long CJK heading to a safe filename under 200 bytes', () => {
  const longTitle = '中文标题'.repeat(30);
  const result = getDeckFilename(longTitle);
  expect(result.endsWith('.apkg')).toBe(true);
  expect(Buffer.byteLength(result, 'utf8')).toBeLessThanOrEqual(200);
  expect(result).not.toContain('�');
});

test('truncated filename is shorter than the full original title plus extension', () => {
  const longTitle =
    'Engramm-Quiz: Welche der folgenden Aussagen über die synaptische Plastizität ist korrekt? ' +
    'A) LTP erhöht die Anzahl der AMPA-Rezeptoren B) LTD verstärkt die synaptische Übertragung ' +
    'C) Calcium spielt keine Rolle D) NMDA-Rezeptoren sind nicht beteiligt';
  const filename = getDeckFilename(longTitle);
  const fullLength = Buffer.byteLength(longTitle + '.apkg', 'utf8');
  expect(fullLength).toBeGreaterThan(200);
  expect(Buffer.byteLength(filename, 'utf8')).toBeLessThanOrEqual(200);
});
