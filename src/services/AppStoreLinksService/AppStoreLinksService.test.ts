import AppStoreLinksService, {
  DEFAULT_APP_STORE_APPLE_ID,
} from './AppStoreLinksService';

describe('AppStoreLinksService', () => {
  const service = new AppStoreLinksService();

  it('builds iOS and Mac product URLs from an explicit Apple ID', () => {
    expect(service.getLinks('1234567890')).toEqual({
      available: true,
      iosUrl: 'https://apps.apple.com/app/id1234567890',
      macUrl: 'https://apps.apple.com/app/id1234567890?mt=12',
    });
  });

  it('falls back to the default Apple ID when none is provided', () => {
    const original = process.env.APPLE_IAP_APP_APPLE_ID;
    delete process.env.APPLE_IAP_APP_APPLE_ID;
    try {
      expect(service.getLinks()).toEqual({
        available: true,
        iosUrl: `https://apps.apple.com/app/id${DEFAULT_APP_STORE_APPLE_ID}`,
        macUrl: `https://apps.apple.com/app/id${DEFAULT_APP_STORE_APPLE_ID}?mt=12`,
      });
    } finally {
      process.env.APPLE_IAP_APP_APPLE_ID = original;
    }
  });

  it('reports unavailable only when the Apple ID is explicitly empty', () => {
    expect(service.getLinks('')).toEqual({ available: false });
  });
});
