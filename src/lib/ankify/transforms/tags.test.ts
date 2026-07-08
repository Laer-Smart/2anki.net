import { sanitizeDeckPath } from './tags';

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
