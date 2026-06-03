import { describe, expect, it } from 'vitest';
import { TEXT_COLOR_SWATCHES } from './textColorSwatches';

describe('TEXT_COLOR_SWATCHES', () => {
  it('leads with a Default no-op swatch carrying an empty hex', () => {
    expect(TEXT_COLOR_SWATCHES[0]).toEqual({
      key: 'default',
      label: 'Default',
      hex: '',
    });
  });

  it('offers the default plus seven colour swatches', () => {
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

  it('matches the server-side swatch hexes', () => {
    expect(TEXT_COLOR_SWATCHES.map((swatch) => swatch.hex)).toEqual([
      '',
      '#1f6feb',
      '#1a7f37',
      '#d1242f',
      '#9a6700',
      '#8250df',
      '#0e7490',
      '#bf3989',
    ]);
  });
});
