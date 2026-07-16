import { extractCountryFromRequest } from './extractCountryFromRequest';

const reqWith = (
  headers: Record<string, string | string[] | undefined>,
  ip?: string
) =>
  ({ headers, ip }) as unknown as Parameters<
    typeof extractCountryFromRequest
  >[0];

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

  it('returns null when no country header is present and no resolvable IP', () => {
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

  it('prefers the header over the geo-IP lookup', () => {
    expect(
      extractCountryFromRequest(reqWith({ 'cf-ipcountry': 'de' }, '8.8.8.8'))
    ).toBe('DE');
  });

  it('falls back to a geo-IP lookup when no header is present', () => {
    expect(extractCountryFromRequest(reqWith({}, '8.8.8.8'))).toBe('US');
  });

  it('returns a 2-letter uppercase code from the geo-IP fallback', () => {
    const result = extractCountryFromRequest(reqWith({}, '8.8.8.8'));
    expect(result).toMatch(/^[A-Z]{2}$/);
  });

  it('returns null for a private/loopback IP with no header', () => {
    expect(extractCountryFromRequest(reqWith({}, '127.0.0.1'))).toBeNull();
  });

  it('returns null for an unresolvable IP sentinel', () => {
    expect(extractCountryFromRequest(reqWith({}, 'unknown'))).toBeNull();
  });

  it('falls through to the geo-IP path when the header is invalid', () => {
    expect(
      extractCountryFromRequest(
        reqWith({ 'cloudfront-viewer-country': 'XX1' }, '8.8.8.8')
      )
    ).toBe('US');
  });
});
