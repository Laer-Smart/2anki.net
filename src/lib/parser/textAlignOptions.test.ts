import { TEXT_ALIGN_OPTIONS, isValidTextAlign } from './textAlignOptions';

describe('textAlignOptions', () => {
  it('leads with a Default no-op option carrying an empty value', () => {
    expect(TEXT_ALIGN_OPTIONS[0]).toEqual({
      key: 'default',
      label: 'Default',
      value: '',
    });
  });

  it('offers the default plus left, center, and right', () => {
    expect(TEXT_ALIGN_OPTIONS.map((option) => option.value)).toEqual([
      '',
      'left',
      'center',
      'right',
    ]);
  });

  it('uses unique keys', () => {
    const keys = TEXT_ALIGN_OPTIONS.map((option) => option.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  describe('isValidTextAlign', () => {
    it('accepts the three real alignments', () => {
      expect(isValidTextAlign('left')).toBe(true);
      expect(isValidTextAlign('center')).toBe(true);
      expect(isValidTextAlign('right')).toBe(true);
    });

    it('rejects the empty default value', () => {
      expect(isValidTextAlign('')).toBe(false);
    });

    it('rejects null and undefined', () => {
      expect(isValidTextAlign(null)).toBe(false);
      expect(isValidTextAlign(undefined)).toBe(false);
    });

    it('rejects an unknown value', () => {
      expect(isValidTextAlign('justify')).toBe(false);
    });

    it('rejects a CSS-injection payload', () => {
      expect(isValidTextAlign('left} body { display:none }')).toBe(false);
    });
  });
});
