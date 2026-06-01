import { parseCheckoutSurface } from './checkoutSurface';

describe('parseCheckoutSurface', () => {
  it('keeps a clean surface label', () => {
    expect(parseCheckoutSurface('limit-wall')).toBe('limit-wall');
    expect(parseCheckoutSurface('upload_success_upsell')).toBe('upload_success_upsell');
    expect(parseCheckoutSurface('pricing_page')).toBe('pricing_page');
  });

  it('lowercases and strips characters outside [a-z0-9_-]', () => {
    expect(parseCheckoutSurface('Downloads Upsell!')).toBe('downloadsupsell');
    expect(parseCheckoutSurface('LIMIT-WALL')).toBe('limit-wall');
  });

  it('caps the length so nothing unbounded reaches metadata', () => {
    expect(parseCheckoutSurface('a'.repeat(100))).toBe('a'.repeat(40));
  });

  it('returns undefined for empty or non-string input', () => {
    expect(parseCheckoutSurface('')).toBeUndefined();
    expect(parseCheckoutSurface('   ')).toBeUndefined();
    expect(parseCheckoutSurface(undefined)).toBeUndefined();
    expect(parseCheckoutSurface(42)).toBeUndefined();
    expect(parseCheckoutSurface({ surface: 'limit-wall' })).toBeUndefined();
  });
});
