import { classifyDevice } from './classifyDevice';

describe('classifyDevice', () => {
  it.each([
    [undefined, 'unknown'],
    [null, 'unknown'],
    ['', 'unknown'],
    ['   ', 'unknown'],
  ] as const)('returns "unknown" for missing/empty UA (%p)', (ua, expected) => {
    expect(classifyDevice(ua)).toBe(expected);
  });

  it.each([
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36',
    'Mozilla/5.0 (iPod touch; CPU iPhone OS 16_0 like Mac OS X) Mobile/15E148',
  ])('classifies phones as mobile (%p)', (ua) => {
    expect(classifyDevice(ua)).toBe('mobile');
  });

  it.each([
    'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 13; SM-X710) AppleWebKit/537.36 Chrome/120.0 Safari/537.36',
  ])('classifies tablets as tablet (%p)', (ua) => {
    expect(classifyDevice(ua)).toBe('tablet');
  });

  it.each([
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36',
  ])('classifies laptops/desktops as desktop (%p)', (ua) => {
    expect(classifyDevice(ua)).toBe('desktop');
  });

  it('treats an Android tablet (no "Mobile" token) as tablet, not mobile', () => {
    const androidTablet =
      'Mozilla/5.0 (Linux; Android 13; SM-T970) AppleWebKit/537.36 Chrome/120.0 Safari/537.36';
    expect(classifyDevice(androidTablet)).toBe('tablet');
  });
});
