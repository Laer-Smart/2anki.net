import { optionalMetadata } from './checkoutMetadata';

describe('optionalMetadata', () => {
  it('keeps present string values', () => {
    expect(
      optionalMetadata({
        pricing_variant: 'b',
        anon_id: 'anon-1',
        surface: 'pricing_page',
        ga_client_id: '123.456',
      })
    ).toEqual({
      pricing_variant: 'b',
      anon_id: 'anon-1',
      surface: 'pricing_page',
      ga_client_id: '123.456',
    });
  });

  it('drops undefined and empty-string values', () => {
    expect(
      optionalMetadata({
        pricing_variant: undefined,
        anon_id: '',
        surface: 'pricing_page',
      })
    ).toEqual({ surface: 'pricing_page' });
  });

  it('returns an empty object when nothing is present', () => {
    expect(optionalMetadata({ a: undefined, b: '' })).toEqual({});
  });
});
