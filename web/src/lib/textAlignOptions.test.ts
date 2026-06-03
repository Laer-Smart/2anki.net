import { describe, expect, it } from 'vitest';
import { TEXT_ALIGN_OPTIONS } from './textAlignOptions';

describe('TEXT_ALIGN_OPTIONS', () => {
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

  it('matches the server-side alignment values', () => {
    expect(TEXT_ALIGN_OPTIONS.map((option) => option.key)).toEqual([
      'default',
      'left',
      'center',
      'right',
    ]);
  });
});
