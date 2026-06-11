import { mergeTags, parseTagInput, sanitizeDeckPath } from './tags';

describe('parseTagInput', () => {
  it('returns an empty list for an empty string', () => {
    expect(parseTagInput('')).toEqual([]);
    expect(parseTagInput('   ')).toEqual([]);
  });

  it('returns an empty list for non-string input', () => {
    expect(parseTagInput(undefined as unknown as string)).toEqual([]);
    expect(parseTagInput(null as unknown as string)).toEqual([]);
  });

  it('splits on whitespace runs', () => {
    expect(parseTagInput('pharm cardio')).toEqual(['pharm', 'cardio']);
    expect(parseTagInput('pharm  cardio\tweek-12')).toEqual([
      'pharm',
      'cardio',
      'week-12',
    ]);
  });

  it('preserves :: for Anki tag hierarchy', () => {
    expect(parseTagInput('pharm::cardio')).toEqual(['pharm::cardio']);
    expect(parseTagInput('pharm::cardio week-12')).toEqual([
      'pharm::cardio',
      'week-12',
    ]);
  });

  it('collapses runs of colons longer than two to ::', () => {
    expect(parseTagInput('a:::b')).toEqual(['a::b']);
    expect(parseTagInput('a::::b')).toEqual(['a::b']);
  });

  it('strips characters outside [A-Za-z0-9_:-]', () => {
    expect(parseTagInput('foo,bar')).toEqual(['foobar']);
    expect(parseTagInput('hello! world?')).toEqual(['hello', 'world']);
    expect(parseTagInput('exam@2026 chem#1')).toEqual(['exam2026', 'chem1']);
  });

  it('drops tokens that sanitize to empty strings', () => {
    expect(parseTagInput('!!! ??? foo')).toEqual(['foo']);
  });

  it('dedupes tokens while preserving first occurrence order', () => {
    expect(parseTagInput('foo bar foo baz')).toEqual(['foo', 'bar', 'baz']);
  });

  it('caps at 10 tags silently', () => {
    const raw = 'a b c d e f g h i j k l m';
    expect(parseTagInput(raw)).toEqual([
      'a',
      'b',
      'c',
      'd',
      'e',
      'f',
      'g',
      'h',
      'i',
      'j',
    ]);
  });

  it('keeps existing underscores and hyphens', () => {
    expect(parseTagInput('exam_block_3 week-12')).toEqual([
      'exam_block_3',
      'week-12',
    ]);
  });
});

describe('sanitizeDeckPath', () => {
  it('returns an empty string for non-string input', () => {
    expect(sanitizeDeckPath(undefined)).toBe('');
    expect(sanitizeDeckPath(null)).toBe('');
    expect(sanitizeDeckPath(42)).toBe('');
  });

  it('preserves :: nesting, spaces, and commas in segment names', () => {
    expect(
      sanitizeDeckPath('MS3::General Surgery::Small Bowel, IBD::Cancer')
    ).toBe('MS3::General Surgery::Small Bowel, IBD::Cancer');
  });

  it('collapses runs of three or more colons down to ::', () => {
    expect(sanitizeDeckPath('A:::B::::C')).toBe('A::B::C');
  });

  it('strips control characters, double quotes, and angle brackets', () => {
    expect(sanitizeDeckPath('A"B<C::D')).toBe('ABC::D');
    expect(sanitizeDeckPath('Tab\tHere::End')).toBe('TabHere::End');
  });

  it('trims whitespace at segment edges and drops empty segments', () => {
    expect(sanitizeDeckPath('  Top  ::  Mid  ::  ')).toBe('Top::Mid');
    expect(sanitizeDeckPath('::Leading::Trailing::')).toBe('Leading::Trailing');
  });

  it('returns an empty string when nothing survives sanitization', () => {
    expect(sanitizeDeckPath('   ')).toBe('');
    expect(sanitizeDeckPath('::::')).toBe('');
  });
});

describe('mergeTags', () => {
  it('returns the source unchanged when extra is empty', () => {
    expect(mergeTags(['foo', 'bar'], [])).toEqual(['foo', 'bar']);
  });

  it('appends extra tags after source tags', () => {
    expect(mergeTags(['foo'], ['bar', 'baz'])).toEqual(['foo', 'bar', 'baz']);
  });

  it('skips extras that are already in source', () => {
    expect(mergeTags(['foo', 'bar'], ['bar', 'baz'])).toEqual([
      'foo',
      'bar',
      'baz',
    ]);
  });

  it('preserves source order even if extras shadow source order', () => {
    expect(mergeTags(['a', 'b', 'c'], ['c', 'a', 'd'])).toEqual([
      'a',
      'b',
      'c',
      'd',
    ]);
  });

  it('dedupes within extras', () => {
    expect(mergeTags([], ['x', 'y', 'x'])).toEqual(['x', 'y']);
  });

  it('returns a fresh array (not a reference to source)', () => {
    const source = ['foo'];
    const out = mergeTags(source, []);
    expect(out).not.toBe(source);
    expect(out).toEqual(source);
  });
});
