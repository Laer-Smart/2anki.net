import { getCardSizePromptSuffix } from './cardSize';

describe('getCardSizePromptSuffix', () => {
  it('returns short instruction for short size', () => {
    const suffix = getCardSizePromptSuffix('short');
    expect(suffix.length).toBeGreaterThan(0);
    expect(suffix.toLowerCase()).toMatch(/1 fact|one fact|80/);
  });

  it('returns medium instruction for medium size', () => {
    const suffix = getCardSizePromptSuffix('medium');
    expect(suffix.length).toBeGreaterThan(0);
    expect(suffix.toLowerCase()).toMatch(/1.2 facts|1-2 facts|160/);
  });

  it('returns detailed instruction for detailed size', () => {
    const suffix = getCardSizePromptSuffix('detailed');
    expect(suffix.length).toBeGreaterThan(0);
    expect(suffix.toLowerCase()).toMatch(/3.4 facts|3-4 facts|320/);
  });

  it('returns empty string for undefined size', () => {
    expect(getCardSizePromptSuffix(undefined)).toBe('');
  });

  it('returns empty string for unknown size values', () => {
    expect(getCardSizePromptSuffix('xl')).toBe('');
  });
});
