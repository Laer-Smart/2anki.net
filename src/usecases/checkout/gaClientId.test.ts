import { parseGaClientId } from './gaClientId';

describe('parseGaClientId', () => {
  it('extracts the client_id from a standard _ga cookie', () => {
    expect(parseGaClientId('GA1.1.1234567890.987654321')).toBe('1234567890.987654321');
  });

  it('handles other version/scope prefixes', () => {
    expect(parseGaClientId('GA1.2.555.666')).toBe('555.666');
    expect(parseGaClientId('GA2.10.42.99')).toBe('42.99');
  });

  it('returns undefined for a value missing the client_id pair', () => {
    expect(parseGaClientId('GA1.1.1234567890')).toBeUndefined();
    expect(parseGaClientId('GA1.1.')).toBeUndefined();
  });

  it('returns undefined for arbitrary or malformed input', () => {
    expect(parseGaClientId('not-a-cookie')).toBeUndefined();
    expect(parseGaClientId('GA1.1.abc.def')).toBeUndefined();
    expect(parseGaClientId('1234567890.987654321')).toBeUndefined();
  });

  it('returns undefined for empty or non-string input', () => {
    expect(parseGaClientId('')).toBeUndefined();
    expect(parseGaClientId(undefined)).toBeUndefined();
    expect(parseGaClientId(null)).toBeUndefined();
    expect(parseGaClientId(42)).toBeUndefined();
  });
});
