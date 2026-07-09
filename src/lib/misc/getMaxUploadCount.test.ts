import { getMaxUploadCount } from './getMaxUploadCount';

describe('getMaxUploadCount', () => {
  it('should return 21 for anon', () => {
    expect(getMaxUploadCount()).toBe(21);
  });

  it('should return the 10x for subscribers and patrons', () => {
    expect(getMaxUploadCount(true)).toBe(2100);
  });
});
