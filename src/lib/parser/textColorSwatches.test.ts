import {
  TEXT_COLOR_SWATCHES,
  isValidTextColor,
} from './textColorSwatches';

describe('textColorSwatches', () => {
  it('leads with a Default no-op swatch carrying an empty hex', () => {
    expect(TEXT_COLOR_SWATCHES[0]).toEqual({
      key: 'default',
      label: 'Default',
      hex: '',
    });
  });

  it('exposes seven colour swatches plus the default', () => {
    expect(TEXT_COLOR_SWATCHES).toHaveLength(8);
  });

  it('uses unique keys', () => {
    const keys = TEXT_COLOR_SWATCHES.map((swatch) => swatch.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('gives every non-default swatch a 6-digit hex colour', () => {
    const colours = TEXT_COLOR_SWATCHES.filter((swatch) => swatch.key !== 'default');
    for (const swatch of colours) {
      expect(swatch.hex).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  describe('isValidTextColor', () => {
    it('accepts a known swatch hex regardless of case', () => {
      expect(isValidTextColor('#1f6feb')).toBe(true);
      expect(isValidTextColor('#1F6FEB')).toBe(true);
    });

    it('rejects the empty default value', () => {
      expect(isValidTextColor('')).toBe(false);
    });

    it('rejects null and undefined', () => {
      expect(isValidTextColor(null)).toBe(false);
      expect(isValidTextColor(undefined)).toBe(false);
    });

    it('rejects a hex outside the curated set', () => {
      expect(isValidTextColor('#123456')).toBe(false);
    });

    it('rejects a CSS-injection payload', () => {
      expect(isValidTextColor('red} body { display:none }')).toBe(false);
      expect(isValidTextColor('#1f6feb} * { color:red')).toBe(false);
    });
  });
});
