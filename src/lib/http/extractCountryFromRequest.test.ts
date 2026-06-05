import { extractCountryFromRequest } from './extractCountryFromRequest';

const reqWith = (headers: Record<string, string | string[] | undefined>) =>
  ({ headers }) as unknown as Parameters<typeof extractCountryFromRequest>[0];

describe('extractCountryFromRequest', () => {
  it('reads CloudFront-Viewer-Country', () => {
    expect(
      extractCountryFromRequest(reqWith({ 'cloudfront-viewer-country': 'US' }))
    ).toBe('US');
  });

  it('falls back to CF-IPCountry', () => {
    expect(extractCountryFromRequest(reqWith({ 'cf-ipcountry': 'de' }))).toBe(
      'DE'
    );
  });

  it('uppercases lowercase header values', () => {
    expect(
      extractCountryFromRequest(reqWith({ 'cloudfront-viewer-country': 'gb' }))
    ).toBe('GB');
  });

  it('returns null when no country header is present', () => {
    expect(extractCountryFromRequest(reqWith({}))).toBeNull();
  });

  it('returns null for non-ISO values', () => {
    expect(
      extractCountryFromRequest(reqWith({ 'cloudfront-viewer-country': 'XX1' }))
    ).toBeNull();
    expect(
      extractCountryFromRequest(reqWith({ 'cloudfront-viewer-country': '' }))
    ).toBeNull();
  });

  it('takes the first value when given an array', () => {
    expect(
      extractCountryFromRequest(
        reqWith({ 'cloudfront-viewer-country': ['US', 'CA'] })
      )
    ).toBe('US');
  });
});
