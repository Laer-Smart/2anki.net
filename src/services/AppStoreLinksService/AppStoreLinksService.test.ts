import AppStoreLinksService from './AppStoreLinksService';

describe('AppStoreLinksService', () => {
  const service = new AppStoreLinksService();

  it('builds iOS and Mac product URLs from the numeric Apple ID', () => {
    expect(service.getLinks('1234567890')).toEqual({
      available: true,
      iosUrl: 'https://apps.apple.com/app/id1234567890',
      macUrl: 'https://apps.apple.com/app/id1234567890?mt=12',
    });
  });

  it.each(['', undefined])(
    'reports unavailable when the Apple ID is %p',
    (appleId) => {
      expect(service.getLinks(appleId)).toEqual({ available: false });
    }
  );
});
